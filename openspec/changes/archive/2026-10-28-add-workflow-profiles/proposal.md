# Proposal

## Why

SpecLane 当前所有运行都执行同等深度的上下文读取和证据输出，小改动也会消耗大量 Token。需要在不删除测试、双重审查、恢复和归档门禁的前提下，让普通运行默认使用更精简且可预测的流程。

## What Changes

- 新运行默认使用 `fast` 工作流档次；状态里没有档次字段的旧运行按 `full` 恢复。
- 用户在对话中单独输入 `full` 时，当前运行单向升级为 `full` 并持久化；系统不得自动升级或降级。
- fast 遇到无法安全简化的需求时，以 `FULL_REQUIRED` 阻塞并等待用户显式升级。
- 状态 CLI 默认只输出当前运行摘要，显式 `--json` 才输出完整状态。
- fast 与 full 均保留测试、双重代码审查和自动归档；审查共享同一范围与 diff，并避免在证据文件中重复日志和摘要。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `workflow-orchestration`: 增加默认 fast、显式 full、无自动升级和 `FULL_REQUIRED` 阻塞行为。
- `resumable-state`: 持久化工作流档次、兼容旧状态，并提供精简状态输出。

## Impact

影响 SpecLane 状态脚本、主 Skill 和工作流参考文档、状态示例、测试、中文 README 与插件版本；不新增运行时依赖，不改变权限、安全、测试、双重审查或归档门禁。
