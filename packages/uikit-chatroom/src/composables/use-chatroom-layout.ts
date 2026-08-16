import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { useViewport } from '@easemob/uikit-core'

/** 布局形态：fullscreen 全屏房间（H5）/ split 三栏分栏（PC） */
export type ChatroomLayoutValue = 'fullscreen' | 'split'

/** 布局解析输入：显式指定或 auto（按视口自动选择） */
export type ChatroomLayoutResolveValue = ChatroomLayoutValue | 'auto'

/**
 * 聊天室布局解析（P5 PC 模式）：把 scene config 的 layout 字段解析为实际布局形态。
 *
 * - 显式 'fullscreen' / 'split'：按指定值渲染，不随视口变化（H5 页面在桌面
 *   浏览器打开仍保持 H5 形态，向后兼容）；
 * - 'auto'：按视口自动选择（窄视口 <768px → fullscreen，宽视口 → split）；
 * - 缺省：fullscreen（与 P2~P4 行为一致）。
 *
 * 断点复用 core `useViewport.isMobile`（768px），不引入第二套断点体系。
 * 容器与 headless 均消费本契约；headless 场景下布局仅供业务自行消费（无 UI）。
 */
export function useChatroomLayout(layout?: MaybeRefOrGetter<ChatroomLayoutResolveValue | undefined>) {
  const { isMobile } = useViewport()

  const layoutMode = computed<ChatroomLayoutValue>(() => {
    const value = toValue(layout)
    if (value === 'auto')
      return isMobile.value ? 'fullscreen' : 'split'
    return value ?? 'fullscreen'
  })

  return { layoutMode }
}
