<script setup lang="ts">
/**
 * 设置面板 - 聊天
 *
 * 包含：容器风格（卡片/平铺）/ 输入框模式 / 输入框风格 / 输入框功能 / 输入框扩展配置（自动聚焦、聚焦边框色、
 * 光标色、选中背景色、最大长度）/ 群已读回执（启用、人数上限）/ 消息列表（时间戳、发送状态）
 *
 * 说明：所有状态来自 useDemoSettings 单例，改动由 demo-page 的 chatConfig 汇总后
 * 实时作用于 EmChatContainer，无需在本面板内再维护副本。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const {
  chatVariant,
  chatInputMode,
  chatInputStyle,
  chatInputFeatures,
  chatInputAutoFocus,
  chatInputFocusBorderColor,
  chatInputCaretColor,
  chatInputSelectionColor,
  chatInputMaxLength,
  groupReadReceiptEnabled,
  groupReadReceiptMaxSize,
  chatShowTime,
  chatMessageSearchEnabled,
  chatMessageServerSearchEnabled,
  chatMessageStatusShowText,
  chatMessageStatusDirection,
  chatMessageStatusPosition,
  chatMessageStatusStyle,
  chatBubbleStyle,
  chatVoiceUnreadDot,
  messageActionMenuTakeover,
  userCardTakeover,
  watermarkEnabled,
} = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="容器风格"
        tip="compact：平铺无圆角，背景铺满（默认，适合自行排版）；card：圆角卡片，圆角跟随主题 componentsShape，由宿主提供灰底与间距"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatVariant === 'card' }"
          @click="chatVariant = 'card'"
        >
          卡片
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatVariant === 'compact' }"
          @click="chatVariant = 'compact'"
        >
          平铺
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="输入框模式"
        tip="简洁：纯文本输入 + 工具栏按钮；富文本：支持加粗、斜体、列表、@提及等排版能力"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputMode === 'simple' }"
          @click="chatInputMode = 'simple'"
        >
          简洁
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputMode === 'rich' }"
          @click="chatInputMode = 'rich'"
        >
          富文本
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="输入框风格"
        tip="输入框工具栏位置：工具栏在上（输入框在下）或工具栏在下（输入框在上）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputStyle === 'toolbar-top' }"
          @click="chatInputStyle = 'toolbar-top'"
        >
          工具栏在上
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputStyle === 'toolbar-bottom' }"
          @click="chatInputStyle = 'toolbar-bottom'"
        >
          工具栏在下
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="输入框功能"
        tip="控制输入框工具栏展示的能力项，取消勾选后对应按钮隐藏、功能不可用"
      />
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <label class="demo-check">
          <input v-model="chatInputFeatures.emoji" type="checkbox" />
          <span>Emoji</span>
        </label>
        <label class="demo-check">
          <input v-model="chatInputFeatures.image" type="checkbox" />
          <span>图片</span>
        </label>
        <label class="demo-check">
          <input v-model="chatInputFeatures.file" type="checkbox" />
          <span>文件</span>
        </label>
        <label class="demo-check">
          <input v-model="chatInputFeatures.voice" type="checkbox" />
          <span>语音</span>
        </label>
        <label class="demo-check">
          <input v-model="chatInputFeatures.video" type="checkbox" />
          <span>视频</span>
        </label>
        <label class="demo-check">
          <input v-model="chatInputFeatures.mention" type="checkbox" />
          <span>@提及</span>
        </label>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="输入框扩展配置"
        tip="输入框细节行为：自动聚焦、聚焦边框色、光标颜色、选中背景色、最大输入长度（0 表示不限制）"
      />
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <label class="demo-check">
          <input v-model="chatInputAutoFocus" type="checkbox" />
          <span>自动聚焦</span>
        </label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">聚焦边框色</span>
          <input
            v-model="chatInputFocusBorderColor"
            placeholder="默认主题色"
            class="demo-input"
            style="flex: 1;"
          />
          <div
            v-if="chatInputFocusBorderColor"
            style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
            :style="{ backgroundColor: chatInputFocusBorderColor }"
          />
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">光标颜色</span>
          <input
            v-model="chatInputCaretColor"
            placeholder="默认"
            class="demo-input"
            style="flex: 1;"
          />
          <div
            v-if="chatInputCaretColor"
            style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
            :style="{ backgroundColor: chatInputCaretColor }"
          />
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">选中背景色</span>
          <input
            v-model="chatInputSelectionColor"
            placeholder="默认"
            class="demo-input"
            style="flex: 1;"
          />
          <div
            v-if="chatInputSelectionColor"
            style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid #e5e7eb;"
            :style="{ backgroundColor: chatInputSelectionColor }"
          />
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">最大长度</span>
          <input
            v-model.number="chatInputMaxLength"
            type="number"
            placeholder="0 表示不限制"
            class="demo-input"
            style="flex: 1;"
          />
        </div>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="群已读回执"
        tip="群消息展示「已读 n 人」回执；人数上限控制统计范围，超过上限的群不再拉取已读明细"
      />
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <label class="demo-check">
          <input v-model="groupReadReceiptEnabled" type="checkbox" />
          <span>启用群已读回执</span>
        </label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; color: var(--uikit-text-secondary); min-width: 80px;">人数上限</span>
          <input
            v-model.number="groupReadReceiptMaxSize"
            type="number"
            placeholder="200"
            class="demo-input"
            style="flex: 1;"
          />
        </div>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="消息列表"
        tip="时间戳显示策略（关闭 / 始终 / 悬停）、消息搜索开关、中性气泡带底色/无底色、发送状态样式（经典小字 / 数字胶囊）与排列方向"
      />
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label class="demo-check">
          <input v-model="chatMessageSearchEnabled" type="checkbox" />
          <span>启用消息搜索</span>
        </label>
        <label class="demo-check">
          <input v-model="chatMessageServerSearchEnabled" type="checkbox" :disabled="!chatMessageSearchEnabled" />
          <span>启用服务端搜索（增值付费服务，需在环信控制台开通；关闭时纯本地搜索）</span>
        </label>
        <div>
          <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">时间戳显示</span>
          <div class="demo-settings__options">
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatShowTime === false }"
              @click="chatShowTime = false"
            >
              关闭
            </button>
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatShowTime === true || chatShowTime === 'always' }"
              @click="chatShowTime = 'always'"
            >
              始终显示
            </button>
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatShowTime === 'hover' }"
              @click="chatShowTime = 'hover'"
            >
              悬停显示
            </button>
          </div>
        </div>

        <div>
          <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">中性气泡（对方）</span>
          <div class="demo-settings__options">
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatBubbleStyle === 'filled' }"
              @click="chatBubbleStyle = 'filled'"
            >
              带底色（默认）
            </button>
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatBubbleStyle === 'plain' }"
              @click="chatBubbleStyle = 'plain'"
            >
              无底色
            </button>
          </div>
        </div>

        <div>
          <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">语音未读红点（对方）</span>
          <div class="demo-settings__options">
            <button
              class="demo-option"
              :class="{ 'demo-option--active': chatVoiceUnreadDot }"
              @click="chatVoiceUnreadDot = true"
            >
              显示（默认）
            </button>
            <button
              class="demo-option"
              :class="{ 'demo-option--active': !chatVoiceUnreadDot }"
              @click="chatVoiceUnreadDot = false"
            >
              隐藏
            </button>
          </div>
          <p style="font-size: 12px; color: var(--uikit-text-tertiary); margin-top: 6px;">
            仅本会话实时收到的语音显示，点击播放后消失；历史消息与刷新后不显示
          </p>
        </div>

        <div>
          <span style="font-size: 13px; color: var(--uikit-text-secondary); display: block; margin-bottom: 6px;">发送状态</span>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusStyle === 'classic' }"
                @click="chatMessageStatusStyle = 'classic'"
              >
                经典
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusStyle === 'capsule' }"
                @click="chatMessageStatusStyle = 'capsule'"
              >
                数字胶囊
              </button>
            </div>
            <label class="demo-check">
              <input v-model="chatMessageStatusShowText" type="checkbox" />
              <span>显示状态文本</span>
            </label>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusDirection === 'horizontal' }"
                @click="chatMessageStatusDirection = 'horizontal'"
              >
                横向排列
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusDirection === 'vertical' }"
                @click="chatMessageStatusDirection = 'vertical'"
              >
                纵向排列
              </button>
            </div>
            <div class="demo-settings__options">
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusPosition === 'below' }"
                @click="chatMessageStatusPosition = 'below'"
              >
                状态在下方
              </button>
              <button
                class="demo-option"
                :class="{ 'demo-option--active': chatMessageStatusPosition === 'inline' }"
                @click="chatMessageStatusPosition = 'inline'"
              >
                状态同行
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="消息操作菜单接管（#message-action-menu）"
        tip="接管右键/长按菜单：内置动作 + 自定义「举报」主菜单项"
      />
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="messageActionMenuTakeover" type="checkbox">
          <span>使用 #message-action-menu 插槽自绘菜单（含举报项）</span>
        </label>
      </div>
      <div class="demo-info">
        消息右键（PC）/ 长按（H5）菜单由内置列表切换为自定义渲染：
        先展示内置动作（引用/转发/置顶等），底部追加「举报」主菜单项。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="名片弹窗接管（#user-card / #group-card）"
        tip="点击聊天头部头像打开业务自定义名片"
      />
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="userCardTakeover" type="checkbox">
          <span>使用 #user-card / #group-card 插槽自绘名片弹窗</span>
        </label>
      </div>
      <div class="demo-info">
        点击聊天头部头像时不再打开内置名片弹窗，改为渲染业务自定义名片卡片。
      </div>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="水印（#watermark）"
        tip="聊天区与通讯录联系人列表注入水印覆盖层"
      />
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="watermarkEnabled" type="checkbox">
          <span>注入当前用户水印（聊天 + 联系人列表）</span>
        </label>
      </div>
      <div class="demo-info">
        开启后聊天区与通讯录联系人列表铺满半透明当前用户水印（UIKit 提供
        pointer-events:none 的覆盖层壳，内容平铺由业务注入）。
      </div>
    </div>
  </div>
</template>
