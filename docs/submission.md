# 插件目录收录

目标目录：[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。提交流程以其 [贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) 为准。

## 提交内容

目录 PR 只新增 `data/plugins/huazhaoyishiba__dsh-roundtable-theater.yml`。对应本地准备文件为 `submission/huazhaoyishiba__dsh-roundtable-theater.yml`；不要手工修改目录仓库的生成 README，也不要改动其他插件条目。

分类选择 `workflow`：目录现有的圆桌会议和多角色讨论插件也归入 Workflow & Automation。介绍只描述实际实现：固定产品经理、程序员、挑刺用户，两轮讨论，追问、投票、重答和主持人结论。当前实现复用 Harness 默认模型的角色请求，不声明多模型调度或独立子 Agent。

## 发布前条件

- GitHub 插件仓库公开，具有真实源码、MIT 许可、安装说明及已构建的 `lib/client.js`。
- 根目录 `package.json` 已声明 `dsh.bundle.patch`，且目标 `cordis.patch.yml` 存在。
- GitHub 仓库包含 `dsh-plugin` topic。
- 发布预构建 GitHub Release 资产 `dsh-roundtable-theater.tgz`。文件名不含版本，因此条目中的 `releases/latest/download/` 地址可以在后续发布中保持稳定；每次发布都要上传同名资产。
- 验证公开仓库地址、默认分支源码和 Release 下载地址确实可访问，再提交本地 YAML。该文件中的发布地址是预定目标，不表示已完成发布。
- 图标可不填；截图可在自己的仓库通过 `screenshots.json` 声明 1–8 张相对路径图片，不向目录仓库新增截图数据。

## 仓库年龄与 CI

目标目录要求仓库创建满 1 天。其 [检查脚本](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/check-submission.mjs) 使用当前时间与 GitHub `created_at` 的差值判断；未满龄会令 Submission gate 暂时失败。

可以提交普通 PR，并如实注明尚待仓库满龄。上游 [regate 工作流](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/.github/workflows/regate.yml) 每 6 小时尝试重跑到龄的开放 PR。无需为了年龄关闭重开、伪造历史或推空提交；自动重查受上游队列和运行额度影响，不保证到龄后立即变绿。

Draft 不豁免最初的年龄检查，而定期 regate 会跳过 Draft，因此不靠 Draft 处理这项等待。源码里未发现 Submission gate 自动关闭 PR 的步骤。

## 人工评审

CI 通过不等于已收录。维护者会核对描述、实际功能、同类差异和源码。发布结果应分别记录为：仓库已公开、Release 已发布、PR 已提交、CI 状态、维护者是否合并；不能把准备好文件描述成已收录。
