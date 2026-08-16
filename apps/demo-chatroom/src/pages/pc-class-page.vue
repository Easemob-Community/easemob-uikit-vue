<script setup lang="ts">
/**
 * PC 小班课双端页（P5 PC 模式验收页）：class preset + split 三栏——
 * 老师/学生同房不同界面形态，业务角色（demo-role.ts）驱动：
 * - teacher（老师，落 owner/admin）：管理位 + 舞台（白板占位）+ 成员侧栏管理；
 * - student（学生，落 member）：纯净观看，管理入口由业务角色层隐藏。
 *
 * 真实权限仍以服务端为准：用房主账号登录切到「学生」视角只隐藏业务层入口，
 * 用 member 账号登录切到「老师」视角管理位不出现（容器按 canManage 门控）。
 */
import { computed, ref } from 'vue'
import { EmChatroomContainer } from '@easemob/uikit-chatroom'
import DemoSceneHeader from '../components/demo-scene-header.vue'
import { CLASS_ROLES, useDemoRole } from '../demo-role'
import type { DemoPlayerRole } from '../demo-role'

const DEFAULT_ROOM_ID = '315874547400706'

const roomIdInput = ref(DEFAULT_ROOM_ID)
const activeRoomId = ref('')
const joinError = ref('')

/** 业务角色抽象（老师/学生；demo 层示范） */
const demoRole = useDemoRole('teacher', { roles: CLASS_ROLES })

/** 场景：class preset + split 三栏 + 成员常驻侧栏（P5） */
const pcClassScene = {
  name: 'class',
  layout: 'split' as const,
  features: {
    memberList: 'panel' as const,
    multilineInput: true,
  },
  panels: { memberWidth: 280 },
}

/** 角色提示（预期权限 vs 实际账号） */
const roleHint = computed(() => {
  const expected = demoRole.expectedPermission.value
  return demoRole.showManage.value
    ? `当前视角：${demoRole.label.value}（预期 ${expected} 权限；房主/管理员账号可见管理位）`
    : `当前视角：${demoRole.label.value}（预期 ${expected} 权限；管理入口已由业务角色层隐藏）`
})

function handleJoin() {
  const id = roomIdInput.value.trim()
  if (!id)
    return
  joinError.value = ''
  activeRoomId.value = id
}

function handleExit() {
  activeRoomId.value = ''
  joinError.value = ''
}

function handleJoinError(error: unknown) {
  joinError.value = (error as Error).message || '加入失败'
}
</script>

<template>
  <div class="pc-class-page">
    <DemoSceneHeader title="PC 小班课（双端）">
      <span>{{ activeRoomId ? '上课中' : '未开课' }}</span>
      <span v-if="activeRoomId" class="pc-class-page__role-hint">{{ roleHint }}</span>
    </DemoSceneHeader>

    <!-- 开课入口 -->
    <div v-if="!activeRoomId" class="pc-class-page__entry">
      <div class="pc-class-page__entry-card">
        <div class="pc-class-page__entry-title">
          📖 进入课堂（PC 双端）
        </div>
        <div class="pc-class-page__entry-desc">
          class preset + split 三栏：老师端（管理位 + 成员管理）/ 学生端（纯净观看）。
          业务角色切换只改视角，真实权限以登录账号为准——房主（hfp）登录可见
          管理位，普通成员登录自动降级。
        </div>
        <input
          v-model="roomIdInput"
          class="pc-class-page__input"
          type="text"
          placeholder="输入聊天室 ID（课堂房间）"
          @keydown.enter="handleJoin"
        >
        <div v-if="joinError" class="pc-class-page__error">
          加入失败：{{ joinError }}
        </div>
        <button class="pc-class-page__join-btn" :disabled="!roomIdInput.trim()" @click="handleJoin">
          进入课堂
        </button>
      </div>
    </div>

    <!-- 课堂容器（split：舞台 + 消息主栏 + 成员侧栏） -->
    <EmChatroomContainer
      v-else
      class="pc-class-page__container"
      :room-id="activeRoomId"
      :scene="pcClassScene"
      @back="handleExit"
      @kicked="handleExit"
      @destroyed="handleExit"
      @join-error="handleJoinError"
    >
      <!-- 舞台区：白板占位（业务注入） -->
      <template #stage>
        <div class="pc-class-stage">
          <span class="pc-class-stage__hint">📝 白板/课件区（业务注入）——学生端同屏可见</span>
        </div>
      </template>

      <!-- 管理位（容器按 canManage 门控；老师视角显示，学生视角隐藏） -->
      <template #manage-actions>
        <div class="pc-class-page__manage">
          <template v-if="demoRole.showManage">
            <span class="pc-class-page__manage-tip">
              👨‍🏫 {{ demoRole.label }} 视角：成员侧栏可禁言 / 移除 / 设管理员（悬停或右键成员）
            </span>
          </template>
          <span v-else class="pc-class-page__manage-tip">
            👩‍🎓 {{ demoRole.label }} 视角：课堂纪律由老师管理，本端不显示管理入口
          </span>
        </div>
      </template>

      <!-- 角色切换器 -->
      <template #header-extra>
        <select
          class="pc-class-page__role-select"
          :value="demoRole.role"
          @change="demoRole.setRole(($event.target as HTMLSelectElement).value as DemoPlayerRole)"
        >
          <option v-for="r in demoRole.roles" :key="r" :value="r">
            {{ r === 'teacher' ? '老师' : '学生' }}
          </option>
        </select>
      </template>
    </EmChatroomContainer>
  </div>
</template>

<style scoped>
.pc-class-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--uikit-bg-base, #fff);
}

.pc-class-page__container {
  flex: 1;
  min-height: 0;
}

.pc-class-page__role-hint {
  font-size: 11px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

/* ===== 开课入口 ===== */
.pc-class-page__entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.pc-class-page__entry-card {
  width: 100%;
  max-width: 420px;
  padding: 24px 20px;
  border-radius: 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  background: var(--uikit-bg-elevated, #fff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-class-page__entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.pc-class-page__entry-desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.6;
}

.pc-class-page__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.14));
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
}

.pc-class-page__error {
  font-size: 12px;
  color: var(--uikit-danger-color, #e5484d);
}

.pc-class-page__join-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.pc-class-page__join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 舞台区 ===== */
.pc-class-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 20% 15%, rgba(99, 102, 241, 0.3), transparent 55%),
    linear-gradient(150deg, #eef2ff 0%, #f8fafc 60%, #e2e8f0 100%);
}

.pc-class-stage__hint {
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  color: #475569;
  font-size: 13px;
}

/* ===== 管理位 ===== */
.pc-class-page__manage-tip {
  font-size: 13px;
  color: var(--uikit-text-secondary, #6b7280);
}

/* ===== 角色切换器 ===== */
.pc-class-page__role-select {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  font-size: 12px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #111827);
  cursor: pointer;
}
</style>
