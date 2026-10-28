# Spec Delta

## Purpose

为 Codex 开发任务提供统一、可验证的阶段路由，使需求只能在满足当前质量门禁后继续，并在缺少依赖或验证失败时给出明确状态。

## ADDED Requirements

### Requirement: 固定阶段工作流
系统 SHALL 按 CLARIFY、PROPOSE、PLAN_REVIEW、APPLY、CODE_REVIEW、FINISH 六个阶段处理开发任务，并允许失败返回必要的前置阶段。

#### Scenario: 正常完成开发任务
- **WHEN** 每个阶段的必需产物和门禁均通过
- **THEN** 系统按顺序推进并最终将运行标记为完成

#### Scenario: 审查发现需求冲突
- **WHEN** CODE_REVIEW 发现实现源于错误或冲突的需求
- **THEN** 系统返回 CLARIFY 或 PROPOSE，而不是直接完成任务

### Requirement: 执行模式
系统 SHALL 支持 `auto` 和 `review` 两种方案审批模式，且两种模式均不得绕过宿主环境的权限和高风险操作审批。

#### Scenario: 自动模式通过方案审查
- **WHEN** `auto` 模式的自动方案审查通过
- **THEN** 系统允许进入 APPLY

#### Scenario: 审批模式尚未批准
- **WHEN** `review` 模式没有与当前方案哈希绑定的用户批准
- **THEN** 系统停留在 PLAN_REVIEW 并拒绝进入 APPLY

### Requirement: 固定依赖检查
系统 MUST 在相关阶段使用前检查 Node.js、OpenSpec 和固定外部 Skill 依赖，缺失时返回可恢复的阻塞结果，不得伪造成功或擅自安装全局依赖。

#### Scenario: OpenSpec 不存在
- **WHEN** 系统无法执行 `openspec --version`
- **THEN** 系统返回 `OPENSPEC_NOT_FOUND` 阻塞状态和安装指引

#### Scenario: 复杂澄清 Skill 缺失
- **WHEN** 复杂需求需要澄清但 `grill-with-docs`、`grilling` 或 `domain-modeling` 任一不可用
- **THEN** 系统阻塞 CLARIFY 且不静默使用另一套澄清流程

### Requirement: 真实验证证据
系统 MUST 记录实际执行的验证结果，不得通过删除测试、弱化断言或口头声明把失败标记为通过。

#### Scenario: 修复预算耗尽
- **WHEN** 测试仍然失败且连续自动修复达到限定次数
- **THEN** 系统保留失败证据并将运行标记为阻塞
