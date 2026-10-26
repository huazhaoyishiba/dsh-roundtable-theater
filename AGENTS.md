# AI 圆桌剧场

编写或审查代码前使用 consistent-architecture 技能。架构基线见 [docs/architecture.md](docs/architecture.md)。

- 最低兼容：DeepSeek Harness 0.1.5-rc.1；声明无上限向上兼容（含预发布版）。已验证运行时见 README；原生 Cordis host/client 双端插件。
- `src/engine.mjs` 独占讨论状态；UI 通过 `state/action` 公共接口访问。
- 复用 Harness 的模型、凭据、持久化和 RPC；不另建模型网络客户端。
- `npm test` 验证关键流程，`npm run build` 构建客户端；`npm run preview` 仅启动明确标识的离线界面演示。
- 不得将演示发言混入正式模型实现，或把界面测试通过描述成真实模型验证通过。
