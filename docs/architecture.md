# 实现基线

项目是 DeepSeek Harness 原生 Cordis 双端插件，最低兼容版本为 0.1.5-rc.1，兼容声明不设置上限，包含后续预发布版。宿主接口以已安装包的公开服务和维护中的内置插件为准。

- `engine.mjs` 是讨论状态唯一所有者，负责两轮顺序、暂停、追问、重答和投票。注入模型生成和存储能力，业务不依赖 DSH。
- `generator.mjs` 经 `ctx.llm.stream` 调用当前 Harness 默认模型，沿用凭据服务；角色使用独立请求和明确的已完成发言上下文。每轮只请求当前角色，不把角色讨论解释为隐藏思考。角色不带文件或命令执行工具。
- `host.mjs` 将引擎接入 `storageDomain` 和 `TypertRemoteService`。`protocol.mjs` 是 host/client 共用的 action 校验与 RPC 描述来源。
- 严格 RPC codec 同时提供 0.1 的 `schema` 和 0.2 的惰性 `create()`，二者复用同一个校验器，不复制协议规则。
- `ui.mjs` 只通过 `api.state/action/subscribe` 操作讨论；Harness client 适配位于 `client.cjs`。真实 UI 与明确标识的离线预览复用相同界面。
- 客户端使用宿主的 React、ModuleLoader、slots、原生 RPC；注册全局 main 面板和 sidebar 入口，不依赖当前聊天会话。
- 主题直接消费宿主 `--dsw-alias-*` 语义颜色、字体与 `color-scheme`；不维护插件自己的明暗状态或主题监听。角色辨识色从宿主语义色派生，预览缺少宿主 token 时使用系统颜色回退。
- 浏览器源码只有纯模块和单个明确导出。构建脚本将这些模块包装为 Harness 的单文件 ModuleLoader 工厂，不引入第二套前端框架或开发服务器。
- 历史存档属于 `roundtable_theater` storage domain；只在发言或用户操作等状态边界持久化，流式片段停留在内存。关闭插件会中止并等待发言、排空写入、关闭 domain；重启后的未完成讨论进入暂停。
- `npm test` 覆盖流程与边界；真实宿主 smoke 检查服务装载、RPC 和客户端入口；离线浏览器验证不能替代真实模型验证。
