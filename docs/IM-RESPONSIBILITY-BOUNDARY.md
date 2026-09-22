# IM 职责边界与 OA↔UIKIT 接入契约

> 状态：**职责边界约定**（对齐 OA 团队用；是"守职责"的判据，不是技术债）
> 对应 TECH-DEBT D126，联动 D122（SDK adapter 抽象）/ D125（微前端宿主兼容）/ D85（Electron 持久化）。
> 目的：把"UIKIT 守好 IM 职责、不做无谓设计/开发"落成可执行的边界清单与接入契约，避免越界耦合。

---

## 一、总判断

UIKIT 的架构方向已到位（port-adapter + 多包 + 中立契约），接下来拼的是**纪律**而非**设计**：五个包封顶、扩展点复用不新造、用"不做清单"守住 IM 边界、按触发点落地。

---

## 二、架构：五个包封顶，不再新增

```text
@easemob-community/uikit-core          SDK 无关底座（theme/locale/原子组件/composable）
@easemob-community/uikit-sdk-contract  中立契约（类型 + repository + SdkAdapter 接口）
@easemob-community/uikit-im            IM 场景（会话/消息/联系人/群 UI + store + 交互）
@easemob-community/uikit-sdk-websdk5   5.x adapter（唯一碰 SDK5 的地方）
@easemob-community/uikit-sdk-webim4    4.x adapter（唯一碰 SDK4 的地方）
```

**不再新增**：portal 层 / integration 层 / 统一消息总线 / OA 适配层——那些是 OA 底座的职责，不是 IM 的职责。多一层就多一份维护成本。

---

## 三、扩展点：复用现有，不新造

| 定开需求 | 用哪个扩展点 | 是否已有 |
| --- | --- | --- |
| 会话分栏 / 工具栏 / 自定义消息 | `useChatPlugin` 插件机制 | ✅ |
| 接管/改造某块 UI | 插槽 slots | ✅ |
| 换用户资料/联系人/群数据来源 | `dataSource` → repository | ✅ |
| 切 SDK（4.x/5.x） | adapter | ✅（D122） |
| 关某个功能 | Provider `features`/`capabilities` | ✅ |

**判断原则**：定开需求先问"能否用现有扩展点消化"；要新增扩展点，先过"是否 IM 职责内"这一问。

---

## 四、快捷搭建：两级接入路径

- **最小接入（开箱即用）**：装包 → `<UIKitProvider appKey sdkConfig>` → 挂一个容器 → 整套 IM 跑起来。
- **定开（二次开发）**：源码直连模式（demo vite alias，改源码刷新即生效）+ 插件/插槽。

`apps/demo` 即"演示 + 联调 + 接入参考"三合一活文档，不再另写接入文档。

---

## 五、不做清单（守职责的核心）

1. **不碰登录/认证**——UIKIT 只接受 `token`；登录流程、SSO、权限中心是 OA 底座的事。
2. **不碰组织架构/用户主数据**——员工/部门/通讯录主数据属 OA；IM 要的昵称/头像/在线状态走 `dataSource`/repository **注入**，UIKIT 不自己拉组织架构。（企业 OA 里最容易越界的一条，守住它基本就守住了职责）
3. **不建消息队列/缓存策略/权限中心**——内部解耦靠"adapter 推中立事件 + store + 插件扩展点"；IM 缓存 = Electron 本地库（D122 Phase 3，后置）。
4. **不引入 Vuetify3 / 微前端框架 / Electron 专属逻辑**——保持纯 Vue3 包，只提供注入点（D85 已列全），由底座实现。
5. **不改公开组件 API 迁就某个平台**——组件名/props/emits/导出是契约，迁就一次就回不去了。

---

## 六、接入契约（OA 底座 ↔ UIKIT）

| 职责 | 归属 |
| --- | --- |
| 登录/认证/SSO、token 获取与刷新 | OA 底座 |
| 用户/组织主数据（员工、部门、通讯录） | OA 底座（经 `dataSource`/repository 注入） |
| 路由/权限/菜单 | OA 底座 |
| 消息队列/缓存/微前端宿主框架 | OA 底座 |
| 拿到 token + appKey 后的 IM 行为（会话/消息/联系人/群/回执/通知） | UIKIT |

一句话：**OA 底座管 token、用户数据、路由、权限；UIKIT 管拿到 token + appKey 之后的一切 IM 行为。**

---

## 七、IM 门面与生命周期语义（借鉴 Agora 灵动课堂）

IM 作为 OA 的"常驻全局能力"，需要一个明确的「挂载 → 卸载」生命周期与单实例约束。借鉴声网灵动课堂（`flexible-classroom-desktop`）的「门面 + `launch()` → disposer + `lock/unlock` 单实例」模式：

- **门面最小化**：对外只有一个入口（`UIKitProvider` + `useUIKit()`，已是雏形），内部 store/domain/event 全隐藏。
- **disposer**：挂载返回一个可完整卸载的函数（unmount + 清理），卸载时 store/事件/监听全清。
- **单实例**：同一 OA 窗口内 IM 单实例（`lock/unlock` 语义），重复挂载返回 noop 或复用。
- **生命周期对称**：登出/卸载清理、重建恢复（对齐 D123 原则）。

落地时点：Phase 1 收口时补齐 `useUIKit()` 的对称 mount/unmount 生命周期（对应 D122 决策 21）；D125 微前端专项时验证子应用卸载能干净回收。

---

## 八、落地节奏：按触发点做，不提前

- **现在**：维持 5.x 现状，不动。
- **存量 4.x 项目立项**：Phase 1 收口（5.x 回归不变）→ Phase 2 写 `webim4` adapter。
- **OA 基座集成前**：D125 微前端专项评估（主题作用域/单例/window 副作用/SDK 卸载）。
- **要 Electron 本地库**：Phase 3 repository + 持久化。

每一个都等**真实触发**再做，不做前瞻性开发。
