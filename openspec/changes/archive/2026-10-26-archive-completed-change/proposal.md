# Proposal

## Why

SpecLane目前在FINISH门禁通过后只把运行标记为完成，OpenSpec Change仍停留在活动目录，导致已交付变更长期堆积且正式规格没有同步。归档应成为每轮功能交付的固定最后阶段，并在中断后安全恢复。

## What Changes

- 在FINISH之后增加ARCHIVE阶段，直接调用 `openspec archive <change-id> --yes --json`。
- 只有归档成功并记录证据后才允许运行状态进入 `completed`。
- 归档中断时先核对活动Change和归档目录，已成功则补记状态，未成功才重试，避免重复执行外部写操作。
- 使用OpenSpec归档现有已完成Change，并验证正式规格同步。
- **BREAKING**：直接使用状态CLI完成运行时，必须先记录通过的 `archive` 步骤。

## Capabilities

### New Capabilities

- `change-archival`: 定义功能完成后的OpenSpec归档顺序、完成门禁、证据和中断恢复行为。

### Modified Capabilities

无。

## Impact

- 修改SpecLane主Skill、工作流/状态/FINISH说明、状态门禁脚本、测试夹具和中文README。
- 插件版本升级至0.4.0。
- 直接使用现有OpenSpec CLI，不增加运行时依赖或自定义归档实现。
