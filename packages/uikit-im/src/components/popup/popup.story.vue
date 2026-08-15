<script setup lang="ts">
import { ref } from 'vue'
import Popup from './popup.vue'
import Button from '../button/button.vue'

const showCenter = ref(false)
const showBottom = ref(false)
const showTop = ref(false)
const showLeft = ref(false)
const showRight = ref(false)

const anchorRef = ref<HTMLElement>()
const showAnchorBottom = ref(false)
const showAnchorTop = ref(false)
const showAnchorLeft = ref(false)
const showAnchorRight = ref(false)

// Group 互斥分组 Demo
const groupAnchorA = ref<HTMLElement>()
const groupAnchorB = ref<HTMLElement>()
const groupAnchorC = ref<HTMLElement>()
const showGroupA = ref(false)
const showGroupB = ref(false)
const showGroupC = ref(false)
</script>

<template>
  <Story title="Popup">
    <Variant title="Center">
      <Button @click="showCenter = true">居中弹出</Button>
      <Popup v-model:show="showCenter">
        <div style="padding: 40px; text-align: center;">
          居中内容
        </div>
      </Popup>
    </Variant>
    <Variant title="Bottom">
      <Button @click="showBottom = true">底部弹出</Button>
      <Popup v-model:show="showBottom" position="bottom">
        <div style="padding: 40px; text-align: center;">
          底部内容
        </div>
      </Popup>
    </Variant>
    <Variant title="Top">
      <Button @click="showTop = true">顶部弹出</Button>
      <Popup v-model:show="showTop" position="top">
        <div style="padding: 40px; text-align: center;">
          顶部内容
        </div>
      </Popup>
    </Variant>
    <Variant title="Left">
      <Button @click="showLeft = true">左侧弹出</Button>
      <Popup v-model:show="showLeft" position="left">
        <div style="padding: 40px; text-align: center;">
          左侧内容
        </div>
      </Popup>
    </Variant>
    <Variant title="Right">
      <Button @click="showRight = true">右侧弹出</Button>
      <Popup v-model:show="showRight" position="right">
        <div style="padding: 40px; text-align: center;">
          右侧内容
        </div>
      </Popup>
    </Variant>

    <Variant title="Anchor Bottom">
      <div style="display: flex; justify-content: center; padding: 40px;">
        <Button ref="anchorRef" @click="showAnchorBottom = true">锚点下方</Button>
      </div>
      <Popup v-model:show="showAnchorBottom" :anchor="anchorRef" placement="bottom" :overlay="false">
        <div style="padding: 16px; min-width: 160px;">
          锚点下方内容
        </div>
      </Popup>
    </Variant>

    <Variant title="Anchor Top">
      <div style="display: flex; justify-content: center; padding: 40px;">
        <Button ref="anchorRef" @click="showAnchorTop = true">锚点上方</Button>
      </div>
      <Popup v-model:show="showAnchorTop" :anchor="anchorRef" placement="top" :overlay="false">
        <div style="padding: 16px; min-width: 160px;">
          锚点上方内容
        </div>
      </Popup>
    </Variant>

    <Variant title="Anchor Left">
      <div style="display: flex; justify-content: center; padding: 40px;">
        <Button ref="anchorRef" @click="showAnchorLeft = true">锚点左侧</Button>
      </div>
      <Popup v-model:show="showAnchorLeft" :anchor="anchorRef" placement="left" :overlay="false">
        <div style="padding: 16px; min-width: 160px;">
          锚点左侧内容
        </div>
      </Popup>
    </Variant>

    <Variant title="Anchor Right">
      <div style="display: flex; justify-content: center; padding: 40px;">
        <Button ref="anchorRef" @click="showAnchorRight = true">锚点右侧</Button>
      </div>
      <Popup v-model:show="showAnchorRight" :anchor="anchorRef" placement="right" :overlay="false">
        <div style="padding: 16px; min-width: 160px;">
          锚点右侧内容
        </div>
      </Popup>
    </Variant>

    <Variant title="Group (互斥分组)">
      <div style="padding: 16px; color: #666; font-size: var(--uikit-font-size-13);">
        同一 group 的 popup 同时只能开一个，打开新的会自动关闭其他。<br>
        依次点击 A → B → C，观察前一个是否自动关闭。
      </div>
      <div style="display: flex; gap: 16px; padding: 24px; justify-content: center;">
        <Button ref="groupAnchorA" @click="showGroupA = true">打开 A</Button>
        <Button ref="groupAnchorB" @click="showGroupB = true">打开 B</Button>
        <Button ref="groupAnchorC" @click="showGroupC = true">打开 C</Button>
      </div>
      <Popup
        v-model:show="showGroupA"
        :anchor="groupAnchorA"
        placement="bottom"
        :overlay="false"
        group="story-demo"
      >
        <div style="padding: 16px; min-width: 120px;">弹窗 A</div>
      </Popup>
      <Popup
        v-model:show="showGroupB"
        :anchor="groupAnchorB"
        placement="bottom"
        :overlay="false"
        group="story-demo"
      >
        <div style="padding: 16px; min-width: 120px;">弹窗 B</div>
      </Popup>
      <Popup
        v-model:show="showGroupC"
        :anchor="groupAnchorC"
        placement="bottom"
        :overlay="false"
        group="story-demo"
      >
        <div style="padding: 16px; min-width: 120px;">弹窗 C</div>
      </Popup>
    </Variant>
  </Story>
</template>

