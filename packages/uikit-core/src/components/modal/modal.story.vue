<script setup lang="ts">
import { ref } from 'vue'
import Modal from './modal.vue'
import Button from '../button/button.vue'
import Input from '../input/input.vue'
import Icon from '../icon/icon.vue'

const show1 = ref(false)
const show2 = ref(false)
const show3 = ref(false)
const show4 = ref(false)
const show5 = ref(false)
const show6 = ref(false)
const show7 = ref(false)
const show8 = ref(false)

const formInput = ref('')
const formTextarea = ref('')
</script>

<template>
  <Story title="Modal">
    <Variant title="Text（文本通知）">
      <Button @click="show1 = true">打开 Text Modal</Button>
      <Modal v-model:show="show1" title="Text" :width="719" confirm-text="Action1" cancel-text="Action2">
        Shall I compare thee to a summer's day? Thou art more lovely and more
        temperate. Rough winds do shake the darling buds of May, And summer's
        lease hath all too short a date. Sometime too hot the eye of heaven
        shines, And often is his gold complexion dimmed; And every fair from
        fair sometime declines...
      </Modal>
    </Variant>

    <Variant title="Text-Icon（图标左对齐）">
      <Button @click="show2 = true">Text-Icon 左对齐</Button>
      <Modal
        v-model:show="show2"
        title="Text-Icon"
        icon="circle/bang"
        :width="719"
        confirm-text="Action1"
        cancel-text="Action2"
      >
        By chance, or nature's changing course, untrimmed;<br>
        But thy eternal summer shall not fade,<br>
        Nor lose possession of that fair thou ow'st,
      </Modal>
    </Variant>

    <Variant title="Text-Icon（居中）">
      <Button @click="show3 = true">Text-Icon 居中</Button>
      <Modal
        v-model:show="show3"
        title="Text-Icon"
        icon="circle/bang"
        content-align="center"
        :width="719"
        confirm-text="Action1"
        cancel-text="Action2"
      >
        By chance, or nature's changing course, untrimmed
      </Modal>
    </Variant>

    <Variant title="Form（表单）">
      <Button @click="show4 = true">打开 Form Modal</Button>
      <Modal v-model:show="show4" title="Form" :width="719" body-flush confirm-text="Action1" cancel-text="Action2">
        <!-- 设计稿 Form 形态：body py-12 贴边，表单项 label 28px + 输入区 px-20 py-8 -->
        <div class="modal-form">
          <div class="modal-form__item">
            <label class="modal-form__label">Input</label>
            <div class="modal-form__control">
              <Input v-model="formInput" placeholder="Input" />
            </div>
          </div>
          <div class="modal-form__item">
            <label class="modal-form__label">Dropdown</label>
            <div class="modal-form__control">
              <!-- 设计稿下拉框静态模拟：通用 Select 组件尚未提供 -->
              <div class="modal-form__select">
                <span>Select Item 1</span>
                <Icon name="chevron/down" :size="16" />
              </div>
            </div>
          </div>
          <div class="modal-form__item">
            <label class="modal-form__label">Input Area</label>
            <div class="modal-form__control">
              <textarea v-model="formTextarea" class="modal-form__textarea" placeholder="Input" rows="3" />
            </div>
          </div>
        </div>
      </Modal>
    </Variant>

    <Variant title="Danger">
      <Button type="danger" @click="show5 = true">删除</Button>
      <Modal
        v-model:show="show5"
        type="danger"
        title="确认删除？"
        confirm-text="删除"
      >
        删除后数据将无法恢复，是否继续？
      </Modal>
    </Variant>

    <Variant title="No Cancel（仅确认）">
      <Button type="primary" @click="show6 = true">无取消按钮</Button>
      <Modal v-model:show="show6" title="提示" :show-cancel="false">
        操作成功完成
      </Modal>
    </Variant>

    <Variant title="Legacy Stretch（等宽铺满兼容）">
      <Button @click="show7 = true">旧版等宽按钮</Button>
      <Modal
        v-model:show="show7"
        title="退出登录"
        footer-align="stretch"
        cancel-text="再想想"
        confirm-text="确认退出"
      >
        确定要退出当前账号吗？
      </Modal>
    </Variant>

    <Variant title="Custom Slots（title/footer 接管）">
      <Button @click="show8 = true">自定义插槽</Button>
      <Modal v-model:show="show8" :width="520">
        <template #title>
          <span style="color: var(--uikit-primary-color)">自定义标题</span>
        </template>
        正文由默认插槽提供。
        <template #footer>
          <Button pill type="outline" @click="show8 = false">知道了</Button>
        </template>
      </Modal>
    </Variant>
  </Story>
</template>

<style>
.modal-form {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.modal-form__label {
  display: block;
  padding: 0 20px;
  height: 28px;
  line-height: 28px;
  font-size: var(--uikit-font-size-11);
  font-weight: var(--uikit-font-weight-medium);
  color: var(--uikit-text-secondary);
}

.modal-form__control {
  padding: 8px 20px;
}

.modal-form__select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  box-sizing: border-box;
  padding: 0 16px;
  border: 1px solid var(--uikit-border-color);
  border-radius: 16px;
  font-size: var(--uikit-font-size-15);
  color: var(--uikit-text-primary);
  cursor: pointer;
}

.modal-form__textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--uikit-border-color);
  border-radius: 16px;
  font-size: var(--uikit-font-size-15);
  color: var(--uikit-text-primary);
  background-color: var(--uikit-bg-base);
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.modal-form__textarea:focus {
  border-color: var(--uikit-primary-color);
}
</style>
