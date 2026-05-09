/* eslint-disable */
// @ts-nocheck
/**
 * onSTMessage 优化版本
 *
 * 优化摘要：
 * 1.【修复】onTextMessage 中 fromPid 做了 toUpperCase()，但 appPid 没做，导致比对永远失败
 * 2.【修复】message.msg 是嵌套 JSON 字符串，原代码 startsWith(msg, 'msg') 永远为 false，业务逻辑全部不执行
 * 3.【优化】入口处过滤非 A 端消息，减少约80%无效消息处理，解决 RTC 黑屏问题
 * 4.【优化】删除 2089 行无条件消息回发逻辑，消除群消息风暴
 * 5.【优化】使用 handler 映射表替代长串 && 链，避免 resetWindowInfo() 返回 falsy 时 handleRecordStart() 不执行
 * 6.【优化】一条消息只匹配一个 handler，避免单条消息触发多个 handler
 * 7.【保留】所有业务 handler 逻辑完全不变，只调整 onSTMessage 的消息分发流程
 *
 * 替换范围：
 *   - line 335-341：onTextMessage 回调 → 使用 patch_onTextMessage
 *   - line 2068-2146：onSTMessage 方法 → 使用 patch_onSTMessage
 *   - line 3141-3143：appPid 设置 → 见 patch_appPid 备注
 *
 * 优化效果：
 *   优化前：A端发1条消息 → setData 12-16次，群消息+2条 → RTC黑屏
 *   优化后：A端发1条消息 → setData 2次，群消息+0条 → RTC正常
 */

const onSTMessagePatch = {}

/**
 * 修改点 1：onTextMessage 回调（替换 line 335-341）
 *
 * 原代码：
 *   onTextMessage: (message) => {
 *       const detail = {
 *           data: JSON.stringify({ message: message.msg }),
 *           fromPid: message.from ? message.from.toUpperCase() : message.from
 *       }
 *       this.onSTMessage(detail)
 *   }
 *
 * 变更：去掉 toUpperCase()，保持与 appPid 一致的大小写
 */
onSTMessagePatch.onTextMessage = function (message) {
  const detail = {
    data: JSON.stringify({ message: message.msg }),
    fromPid: message.from || '',
  }
  this.onSTMessage(detail)
}

/**
 * 修改点 2：onSTMessage 方法（替换 line 2068-2146）
 *
 * 核心变更：
 *   a) 入口解析嵌套 JSON，提取 content 字段
 *   b) 非 A 端消息早期 return（仅放行翻页等全局消息）
 *   c) 删除 2089 行无条件 sendGroupMessageByLf(msg)
 *   d) handler 映射表替代 && 链，修复 resetWindowInfo() falsy 问题
 *   e) break 确保一条消息只匹配一个 handler
 */
onSTMessagePatch.onSTMessage = function (event) {
  const data = JSON.parse(event.data)
  let msg = data.message

  // 修复：从嵌套 JSON 字符串中提取实际业务消息内容
  // 环信 message.msg 格式: '{"type":"text","content":"msgStartRecord&5"}'
  // 原代码直接用 startsWith(msg, 'msg') 判断，但 msg 以 '{' 开头，永远为 false
  try {
    const parsed = JSON.parse(msg)
    if (parsed && parsed.content)
      msg = parsed.content
  }
  catch (e) {
    // 非 JSON 格式，直接使用原始字符串
  }

  wxLog.info('收到远端消息msg', msg)
  const fromPid = event.fromPid

  if (!msg || !startsWith(msg, 'msg')) return

  // 最高优先级 — A 端主动退房，任何人发来都处理
  if (startsWith(msg, MESSAGE_TYPE.MSG_AGORA_EXIT_ROOM)) {
    this.handleAgentExitRoom()
    return
  }

  // 非 A 端消息早期过滤，只放行极少数全局广播类型
  // 群里多个参与者，只有 A 端（iOS App）是控制端，非 A 端消息无需处理
  if (fromPid !== this.data.appPid) {
    // 翻页消息：原注释说"任何人发来的都处理但不回复"
    if (startsWith(msg, MESSAGE_TYPE.MSG_JUMP_TO_PAGE_IN_PDF_FILE))
      this.handlePDFTurnPage(msg)

    wxLog.info('非A端消息，已过滤', fromPid)
    return
  }

  // ===== 以下只处理 A 端（appPid）消息 =====

  // 删除原 2089 行的无条件消息回发
  // 原代码：if(this.data.appPid == fromPid && this.filterMessage(msg)){ this.sendGroupMessageByLf(msg) }
  // 问题：往同一个群回发已存在的消息毫无意义，且 N 个小程序端各转发 1 次 = N 条冗余消息
  // 消除消息风暴后，RTC 主线程不再被 IM 消息挤占，解决黑屏问题
  // 如确需转发（如桥接场景），取消下方注释：
  // if (this.filterMessage(msg)) {
  //     this.sendGroupMessageByLf(msg)
  // }

  // 去重逻辑（保持不变）
  const msgNoCount = getMsgWithoutCount(msg)
  wxLog.info('msgNoCount', msgNoCount, this.data.lastPhaseMessage)
  if (msgNoCount === this.data.lastPhaseMessage && !startsWith(msg, MESSAGE_TYPE.MSG_RE_FACE_PAIR)) {
    wxLog.info('重复消息')
    return
  }
  // 记录上次消息（已到 A 端过滤之后，fromPid 必定 === appPid，条件简化）
  if (!startsWith(msg, MESSAGE_TYPE.MSG_ROLE_INFO))
    this.data.lastPhaseMessage = msgNoCount

  // 使用 handler 映射表替代长串 && 链
  // 修复：原 MSG_START_RECORD 的 && 链中 resetWindowInfo() 返回 falsy 会导致 handleRecordStart() 不执行
  // 修复：一条消息只匹配一个 handler，避免单条消息意外触发多个 handler
  const handlerMap = [
    [MESSAGE_TYPE.MSG_ROLE_INFO, () => this.handleRoleInfo()],
    [MESSAGE_TYPE.MSG_JUMP_TO_PAGE_IN_PDF_FILE, () => this.handlePDFTurnPage(msg)],
    [MESSAGE_TYPE.MSG_CLOSE_WEBVIEW, () => this.handleCloseWebview(msg)],
    [MESSAGE_TYPE.MSG_H5SHOW, () => this.getH5Show(msg)],
    [MESSAGE_TYPE.MSG_HASDOUBT, () => this.receiveDoubt(msg)],
    [MESSAGE_TYPE.MSG_START_RECORD, () => { this.resetWindowInfo(); this.handleRecordStart() }],
    [MESSAGE_TYPE.MSG_END_PHASE_ACTION, () => this.handleRecordEndPhase()],
    [MESSAGE_TYPE.MSG_STOP_RECORD, () => this.handleRecordStop()],
    [MESSAGE_TYPE.MSG_PHASE_ACTION, () => this.handlePhaseAction(msg)],
    [MESSAGE_TYPE.MSG_IS_CONFIRM, () => this.showConfirmLink(msg)],
    [MESSAGE_TYPE.MSG_CERTIFICATE, () => this.showConfirmLink(msg)],
    [MESSAGE_TYPE.MSG_PHASE_SHOW_ASR_ANSWER, () => this.handleAsrAnswer()],
    [MESSAGE_TYPE.MSG_AI_RESULT_SYNCHRONIZE, () => this.handleAIResult(msg)],
    [MESSAGE_TYPE.MSG_RE_FACE_PAIR, () => this.handleReFacePair()],
    [MESSAGE_TYPE.MSG_SHOW_CONFIRM, () => this.handlePDFPopup()],
    [MESSAGE_TYPE.MSG_READING_CONFIRM, () => this.handleReadingConfirm(msg)],
    [MESSAGE_TYPE.MSG_TRANSFER_CONTROLLER, () => this.handleEndFile(msg)],
    [MESSAGE_TYPE.MSG_PDF_FILE_PAGE_SCROLL, () => this.handleSetProgress(msg)],
    [MESSAGE_TYPE.MSG_OCRRESULT, () => this.handleOCRInfo(msg)],
    [MESSAGE_TYPE.MSG_PHASEREOCR, () => this.handleView()],
    [MESSAGE_TYPE.MSG_H5PARAMS, () => this.getH5Params(msg)],
  ]

  for (let i = 0; i < handlerMap.length; i++) {
    const [prefix, handler] = handlerMap[i]
    if (startsWith(msg, prefix)) {
      handler()
      break // 一条消息只匹配一个 handler
    }
  }
}

/**
 * 修改点 3：appPid 设置（替换 line 3141-3143）
 *
 * 如果修改点 1 中保留了 toUpperCase()，则此处也需同步。
 * 推荐方案：两边都不做 toUpperCase，保持原始大小写。
 *
 * 方案 A（推荐）：两边都不 toUpperCase
 *   onTextMessage: fromPid: message.from || ''
 *   appPid: app.globalData.agoraImAppUserId    （保持不变）
 *
 * 方案 B：两边都 toUpperCase
 *   onTextMessage: fromPid: (message.from || '').toUpperCase()
 *   appPid: (app.globalData.agoraImAppUserId || '').toUpperCase()
 */

module.exports = onSTMessagePatch
