# CLARIFY

先检查代码、测试、配置和现有文档。能从仓库确定的事实不要转问用户。

## 轻量澄清

fast 中，需求明确且低风险时由 `$speclane` 直接确认：目标、非目标、验收标准、场景、执行模式和UI模式。只读取当前任务必要上下文。

## 复杂澄清

以下任一成立时，fast 必须使用 `FULL_REQUIRED` 阻塞且不得自动升级。用户单独输入 `full` 后，确认组合 Skill `grill-with-docs` 已安装，并直接加载宿主可调用的 `grilling` 与 `domain-modeling`：

- 需求有多种合理解释；
- 业务边界、失败行为、权限或数据规则不明确；
- 存在架构或难以逆转的决策；
- 用户描述与代码冲突；
- 用户要求深入讨论方案。

`grill-with-docs` 的上游元数据禁止模型直接调用，因此它可以不出现在宿主可调用 Skill 列表中；preflight 会检查初始化器支持的全局安装位置。缺少组合 Skill 安装文件或任一可调用子 Skill 时写入 `REQUIRED_SKILL_NOT_FOUND` 并阻塞，不使用另一套流程静默替代。

澄清跨回合时，把已确认、待决定、当前建议和下一问题保存为运行目录中的 `clarify.md`，状态设为 `awaiting_user_input`。领域术语或真正需要解释的决策才进入项目上下文或 ADR，不为普通改动制造文档。

## UI模式

- `none`: 不涉及界面。
- `existing`: 修改界面但沿用现有设计系统。
- `figma_preferred`: Figma可用时参考；不可用必须记录降级原因。
- `figma_required`: 没有有效Figma证据即阻塞。
