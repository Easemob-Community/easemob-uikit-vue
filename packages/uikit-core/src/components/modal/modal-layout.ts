/**
 * EmModal 布局决策（移动端回落 / footer 口径）。
 *
 * 抽出为纯函数集中表达「PC / H5 × 表单类(default) / 确认通知类(语义 type)」的行为矩阵，
 * 供 modal.vue 消费并由单测锁定，避免模板里散落条件判断。
 */

export interface ModalLayoutInput {
  /** 是否移动端视口（<768，来自 useViewport().isMobile） */
  isMobile: boolean
  /** 弹窗类型：default 表单类；info/success/warning/danger 为短文案确认/通知类 */
  type: 'default' | 'danger' | 'warning' | 'info' | 'success'
  /** 业务传入的 footer 对齐方式（移动端忽略，强制 stretch） */
  footerAlign: 'right' | 'stretch'
}

export interface ModalLayout {
  /** Popup 位置：移动端仅表单类回落 bottom sheet，确认/通知类保持居中 */
  position: 'bottom' | 'center'
  /** 是否由 Popup 承担外壳（bottom sheet 形态为 true；居中形态一律由 Modal 自绘外壳） */
  shell: boolean
  /** 实际 footer 对齐：移动端强制等宽铺满，桌面端跟随 footerAlign prop */
  footerAlign: 'right' | 'stretch'
  /** footer 默认按钮顺序：移动端「取消在左、确认在右」，桌面端「确认在左、取消在右」 */
  footerOrder: 'cancel-first' | 'confirm-first'
}

export function resolveModalLayout(input: ModalLayoutInput): ModalLayout {
  const sheet = input.isMobile && input.type === 'default'
  return {
    position: sheet ? 'bottom' : 'center',
    shell: sheet,
    footerAlign: input.isMobile ? 'stretch' : input.footerAlign,
    footerOrder: input.isMobile ? 'cancel-first' : 'confirm-first',
  }
}
