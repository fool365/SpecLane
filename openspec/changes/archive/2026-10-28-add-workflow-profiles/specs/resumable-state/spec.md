# Spec Delta

## MODIFIED Requirements

### Requirement: 每次运行持久化状态
系统 SHALL 为每次运行创建 `.auto-dev/runs/<run-id>/state.json`，记录 Change、工作流档次、模式、UI 模式、当前步骤、步骤状态、方案哈希和错误信息。

#### Scenario: 初始化新运行
- **WHEN** 用户首次启动一个不存在活动运行的 Change
- **THEN** 系统创建状态文件、把工作流档次设置为 `fast` 并把当前步骤设置为 CLARIFY

#### Scenario: 重复初始化同一运行
- **WHEN** 相同运行的状态文件已经存在
- **THEN** 系统拒绝覆盖原状态文件

## ADDED Requirements

### Requirement: 工作流档次恢复兼容性
系统 MUST 在恢复时保留状态中的工作流档次。升级前创建且没有档次字段的旧状态 MUST 按 `full` 迁移，避免插件升级后静默降低未完成运行的处理深度。

#### Scenario: 恢复 fast 运行
- **WHEN** 状态文件记录 `workflow_profile` 为 `fast`
- **THEN** 系统继续使用 fast

#### Scenario: 恢复 full 运行
- **WHEN** 状态文件记录 `workflow_profile` 为 `full`
- **THEN** 系统继续使用 full

#### Scenario: 恢复旧版状态
- **WHEN** 状态文件没有 `workflow_profile`
- **THEN** 系统写入 `full` 后再继续恢复

### Requirement: 精简状态命令输出
系统 SHALL 让状态变更命令默认只输出运行标识、工作流档次、全局状态、当前步骤、当前步骤状态和错误摘要；调用方显式请求 `--json` 时 MUST 返回完整状态对象。精简输出不得改变落盘内容。

#### Scenario: 默认状态更新输出
- **WHEN** 调用方执行状态初始化、开始、通过、阻塞、恢复或升级命令且未提供 `--json`
- **THEN** 命令返回单行摘要而不是完整步骤历史

#### Scenario: 请求完整状态
- **WHEN** 调用方对状态命令提供 `--json`
- **THEN** 命令返回完整、可解析的状态对象

#### Scenario: 精简输出后恢复
- **WHEN** 状态命令只显示摘要后运行被中断
- **THEN** 完整状态和备份仍保存在状态文件中并可正常恢复
