import { computed, ref } from 'vue'

/**
 * Demo 层业务角色抽象（P5 PC 模式示范——UIKit 不内置角色，业务自己定义）。
 *
 * 本文件即「业务角色抽象指南」的参考实现：角色是业务概念，权限是服务端概念，
 * 两者正交但最终落到权限上——UIKit 只认识 owner / admin / member：
 * - 私域直播：anchor（主播，落 owner）/ assistant（场控，落 admin）/
 *   audience（观众，落 member）；
 * - 小班课：teacher（老师，落 owner）/ student（学生，落 member）。
 *
 * 使用方式：页面声明角色 → 用 label / expectedPermission / showManage 驱动 UI
 * 形态；真正的操作权限仍以 useChatroomMember.canManage / canManageMember 为准
 * （服务端最终校验）。角色与权限不一致时（如 member 账号切到「主播」视角），
 * 管理 UI 按权限不出现、操作被服务端拒绝兜底——本 demo 的角色切换只改变
 * 业务层视角，不改变真实权限。
 */

export type DemoPlayerRole = 'anchor' | 'assistant' | 'audience' | 'teacher' | 'student'

interface DemoRoleMeta {
  /** 角色展示名 */
  label: string
  /** 该角色对应的房间权限预期（业务映射；服务端以实际账号权限为准） */
  expectedPermission: 'owner' | 'admin' | 'member'
  /** 业务角色是否显示管理位（主播/老师/场控显示，观众/学生隐藏） */
  showManage: boolean
}

const ROLE_META: Record<DemoPlayerRole, DemoRoleMeta> = {
  anchor: { label: '主播', expectedPermission: 'owner', showManage: true },
  assistant: { label: '场控', expectedPermission: 'admin', showManage: true },
  audience: { label: '观众', expectedPermission: 'member', showManage: false },
  teacher: { label: '老师', expectedPermission: 'owner', showManage: true },
  student: { label: '学生', expectedPermission: 'member', showManage: false },
}

/** 私域直播可选角色（页面角色切换器用） */
export const LIVE_ROLES: DemoPlayerRole[] = ['anchor', 'assistant', 'audience']
/** 小班课可选角色 */
export const CLASS_ROLES: DemoPlayerRole[] = ['teacher', 'student']

/** 业务角色抽象：声明式角色 → UI 形态（演示用；生产业务可替换为自己的映射） */
export function useDemoRole(initial: DemoPlayerRole, options: { roles?: DemoPlayerRole[] } = {}) {
  const role = ref<DemoPlayerRole>(initial)
  const meta = computed(() => ROLE_META[role.value])
  const roles = options.roles ?? [initial]

  return {
    /** 当前业务角色 */
    role,
    /** 角色展示名 */
    label: computed(() => meta.value.label),
    /** 角色对应的房间权限预期（用于提示「以 XX 账号登录」） */
    expectedPermission: computed(() => meta.value.expectedPermission),
    /** 是否显示管理位（业务层视角；实际可见性仍以服务端权限为准） */
    showManage: computed(() => meta.value.showManage),
    /** 可选角色列表（切换器用） */
    roles,
    setRole: (next: DemoPlayerRole) => {
      role.value = next
    },
  }
}
