<script setup lang="ts">
/**
 * 设置面板 - 聊天
 *
 * 包含：输入框模式 / 输入框风格 / 输入框功能 / 输入框扩展配置（自动聚焦、聚焦边框色、
 * 光标色、选中背景色、最大长度）/ 群已读回执（启用、人数上限）/ 消息列表（时间戳、发送状态）
 *
 * 说明：所有状态来自 useDemoSettings 单例，改动由 demo-page 的 chatConfig 汇总后
 * 实时作用于 EmChatContainer，无需在本面板内再维护副本。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const {
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
  chatMessageStatusShowText,
  chatMessageStatusDirection,
  chatMessageStatusPosition,
  chatMessageStatusStyle,
} = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">输入框模式</label>
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
      <label class="demo-settings__label">输入框风格</label>
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputStyle === 'wechat' }"
          @click="chatInputStyle = 'wechat'"
        >
          微信
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': chatInputStyle === 'feishu' }"
          @click="chatInputStyle = 'feishu'"
        >
          飞书
        </button>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">输入框功能</label>
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
      <label class="demo-settings__label">输入框扩展配置</label>
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
            placeholder="0=无限制"
            class="demo-input"
            style="flex: 1;"
          />
        </div>
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">群已读回执</label>
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
      <label class="demo-settings__label">消息列表</label>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label class="demo-check">
          <input v-model="chatMessageSearchEnabled" type="checkbox" />
          <span>启用消息搜索</span>
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
  </div>
</template>
