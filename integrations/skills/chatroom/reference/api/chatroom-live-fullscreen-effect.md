<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveFullscreenEffect API

### Props

| 属性         | 类型                           | 默认值 | 说明                                                                                            |
| --- | --- | --- | --- |
| items      | `LiveFullscreenEffectItem[]` | —   | 动效队列（push 新增条目，组件按 id 增量消费）                                                                   |
| fullscreen | `boolean`                    | —   | 是否全屏铺满视口（缺省 true）。false 时改为铺满**最近定位祖先**<br>（absolute + inset 0）——嵌套容器 / 文档演示等需要把动效约束在局部区域时使用。 |

### Events

| 事件名   | 参数                   | 说明               |
| --- | --- | --- |
| `end` | id: string \| number | 某条动效结束（动画完成或时长到） |
