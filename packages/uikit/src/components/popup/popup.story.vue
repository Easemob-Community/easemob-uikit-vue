<script setup lang="ts">
import { ref } from 'vue'
import Popup from './popup.vue'
import Button from '../button/button.vue'

const showCenter = ref(false)
const showBottom = ref(false)
const showTop = ref(false)
const showLeft = ref(false)
const showRight = ref(false)
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
  </Story>
</template>
