# Tasks

## 1. 归档状态与完成门禁

- [x] 1.1 扩展状态脚本，使方案变化会失效ARCHIVE且 `state complete` 只接受带证据的已通过归档步骤；用状态和门禁测试验证未归档阻塞、归档通过和中断恢复
- [x] 1.2 更新SpecLane主Skill、工作流、状态和FINISH说明，明确直接调用OpenSpec、结果核对和禁止盲目重放；用插件文档一致性校验验证

## 2. 发布入口与集成验证

- [x] 2.1 更新中文README、示例状态和插件版本至0.4.0，并运行完整测试、插件校验和OpenSpec严格校验

## Workflow follow-up

- 在实现、测试、双重审查和FINISH门禁通过后，直接调用OpenSpec归档现有已完成Change并验证正式规格。
- 使用新ARCHIVE流程归档当前 `archive-completed-change`，验证中断恢复证据后再把运行标记为completed。
