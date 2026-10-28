# resumable-state Specification

## Purpose
为每次 SpecLane 运行保存可靠、可审计的工作流检查点，使会话或进程中断后能够核实现有产物并从正确步骤继续。

## Requirements

### Requirement: 每次运行持久化状态
系统 SHALL 为每次运行创建 `.auto-dev/runs/<run-id>/state.json`，记录 Change、工作流档次、模式、UI 模式、当前步骤、步骤状态、方案哈希和错误信息。

#### Scenario: 初始化新运行
- **WHEN** 用户首次启动一个不存在活动运行的 Change
- **THEN** 系统创建状态文件、把工作流档次设置为 `fast` 并把当前步骤设置为 CLARIFY

#### Scenario: 重复初始化同一运行
- **WHEN** 相同运行的状态文件已经存在
- **THEN** 系统拒绝覆盖原状态文件

### Requirement: 原子状态更新
系统 MUST 通过临时文件和原子替换更新状态，并在覆盖前保留最近一次有效备份。

#### Scenario: 更新过程被中断
- **WHEN** 临时状态尚未完成替换时进程终止
- **THEN** 原 `state.json` 或 `state.json.bak` 仍可用于恢复

### Requirement: 中断恢复
系统 SHALL 在恢复时把遗留的 `running` 步骤标记为 `interrupted`，随后核验产物，只有不满足当前门禁的步骤才允许重试。

#### Scenario: 中断步骤实际已经完成
- **WHEN** 当前步骤标记为 `interrupted` 但产物通过门禁
- **THEN** 系统补记该步骤通过并继续下一步骤

#### Scenario: 中断步骤只有部分产物
- **WHEN** 当前步骤产物不完整或验证失败
- **THEN** 系统保留已有文件并从该步骤继续

### Requirement: 方案批准失效
系统 MUST 对方案文件计算稳定哈希；方案哈希变化时，旧人工批准以及 PLAN_REVIEW 之后的完成状态不得继续生效。

#### Scenario: 已批准方案发生变化
- **WHEN** `proposal.md`、`design.md`、`tasks.md`、`specs/**/*` 或 UI 需求声明发生变化
- **THEN** 系统拒绝使用旧批准进入 APPLY

### Requirement: 不盲目重试外部副作用
系统 MUST 在恢复数据库迁移、部署或第三方写操作前核实外部真实状态或使用幂等机制。

#### Scenario: 写操作结果不确定
- **WHEN** 状态记录显示操作中断且无法确认外部执行结果
- **THEN** 系统阻塞自动重试并要求核实或人工处理

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
