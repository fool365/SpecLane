# Proposal

## Why

`SpecLane init` 已安装 `grill-with-docs`，但该上游 Skill 设置了 `disable-model-invocation: true`，不会出现在 Codex 的可调用 Skill 列表中。当前预检仅检查该列表，导致新项目初始化成功后仍被错误阻塞。

## What Changes

- 固定组合 Skill `grill-with-docs` 同时支持通过宿主列表或全局安装文件确认存在。
- 真正需要直接调用的 `grilling`、`domain-modeling` 和 `open-code-review-delegate` 仍必须出现在宿主可调用 Skill 列表中。
- 增加“已安装但被宿主隐藏”的回归测试，并更新使用说明。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `workflow-orchestration`: 修正固定外部 Skill 的可用性判定，避免把已安装但不可模型调用的组合 Skill 误报为缺失。

## Impact

影响 `skills/speclane/scripts/speclane.mjs` 的 preflight、相关单元测试、Skill 说明和 README；不改变上游 Skill 内容、安装来源或其他工作流门禁。
