import { describe, expect, it } from 'vitest'
import { resolveModalLayout } from '../modal-layout'

/**
 * EmModal 布局决策矩阵测试（PC / H5 × 表单类(default) / 确认通知类(语义 type)）：
 * - 移动端仅表单类回落 bottom sheet，确认/通知类保持居中（shell 由 Modal 自绘）
 * - 移动端 footer 强制等宽铺满（stretch）且按钮顺序翻转为「取消在左、确认在右」
 * - 桌面端 footer 保持 footerAlign prop 与「确认在左、取消在右」现状
 */

describe('resolveModalLayout', () => {
  it('桌面端 + 表单类：居中、自绘外壳、footer 跟随 prop（right）、确认在左', () => {
    const layout = resolveModalLayout({ isMobile: false, type: 'default', footerAlign: 'right' })
    expect(layout).toEqual({
      position: 'center',
      shell: false,
      footerAlign: 'right',
      footerOrder: 'confirm-first',
    })
  })

  it('桌面端 + 语义类：与表单类一致（居中、footer 不受影响）', () => {
    for (const type of ['info', 'success', 'warning', 'danger'] as const) {
      const layout = resolveModalLayout({ isMobile: false, type, footerAlign: 'right' })
      expect(layout.position).toBe('center')
      expect(layout.shell).toBe(false)
      expect(layout.footerAlign).toBe('right')
      expect(layout.footerOrder).toBe('confirm-first')
    }
  })

  it('桌面端显式 footerAlign="stretch" 保持等宽铺满（旧形态兼容不回归）', () => {
    const layout = resolveModalLayout({ isMobile: false, type: 'default', footerAlign: 'stretch' })
    expect(layout.footerAlign).toBe('stretch')
    expect(layout.footerOrder).toBe('confirm-first')
  })

  it('移动端 + 表单类：回落 bottom sheet（shell 交还 Popup）、footer 等宽铺满且取消在左', () => {
    const layout = resolveModalLayout({ isMobile: true, type: 'default', footerAlign: 'right' })
    expect(layout).toEqual({
      position: 'bottom',
      shell: true,
      footerAlign: 'stretch',
      footerOrder: 'cancel-first',
    })
  })

  it('移动端 + 语义类（确认/通知）：保持居中、自绘外壳，footer 仍按移动端口径铺满翻转', () => {
    for (const type of ['info', 'success', 'warning', 'danger'] as const) {
      const layout = resolveModalLayout({ isMobile: true, type, footerAlign: 'right' })
      expect(layout.position).toBe('center')
      expect(layout.shell).toBe(false)
      expect(layout.footerAlign).toBe('stretch')
      expect(layout.footerOrder).toBe('cancel-first')
    }
  })
})
