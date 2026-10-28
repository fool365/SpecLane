# workflow-orchestration Specification

## Purpose
为 Codex 开发任务提供统一、可验证的阶段路由，使需求只能在满足当前质量门禁后继续，并在缺少依赖或验证失败时给出明确状态。

## Requirements

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
系统 MUST 在相关阶段使用前检查 Node.js、OpenSpec 和固定外部 Skill 依赖，缺失时返回可恢复的阻塞结果，不得伪造成功或擅自安装全局依赖。对于明确禁止模型调用的组合 Skill，系统 MUST 接受可调用列表或受支持的全局安装位置作为存在证据；其可调用子 Skill 仍 MUST 由宿主列表确认。

#### Scenario: OpenSpec 不存在
- **WHEN** 系统无法执行 `openspec --version`
- **THEN** 系统返回 `OPENSPEC_NOT_FOUND` 阻塞状态和安装指引

#### Scenario: 复杂澄清 Skill 缺失
- **WHEN** 复杂需求需要澄清但 `grill-with-docs` 未安装，或 `grilling`、`domain-modeling` 任一不可调用
- **THEN** 系统阻塞 CLARIFY 且不静默使用另一套澄清流程

#### Scenario: 组合 Skill 已安装但不在可调用列表
- **WHEN** `grill-with-docs` 已存在于受支持的全局 Skill 目录，但因禁止模型调用而未出现在宿主可调用列表中
- **THEN** 预检接受其安装证据，并继续验证 `grilling` 与 `domain-modeling` 的可调用性

### Requirement: 真实验证证据
系统 MUST 记录实际执行的验证结果，不得通过删除测试、弱化断言或口头声明把失败标记为通过。

#### Scenario: 修复预算耗尽
- **WHEN** 测试仍然失败且连续自动修复达到限定次数
- **THEN** 系统保留失败证据并将运行标记为阻塞

### Requirement: 工作流档次
系统 SHALL 为每次运行保存 `fast` 或 `full` 档次。新运行 MUST 默认为 `fast`；只有用户在对话中单独输入 `full` 时才允许当前运行单向升级为 `full`，系统不得自动升级或降级。

#### Scenario: 新运行使用 fast
- **WHEN** 用户启动一个尚无状态的新运行
- **THEN** 系统把工作流档次设置为 `fast`

#### Scenario: 用户显式升级
- **WHEN** 当前运行是 `fast` 且用户单独输入 `full`
- **THEN** 系统把当前运行升级为 `full` 并从当前检查点继续

#### Scenario: 系统发现复杂需求
- **WHEN** fast 运行发现需要完整澄清或设计的复杂性
- **THEN** 系统不得自动改变档次

#### Scenario: full 不允许降级
- **WHEN** 当前运行已经是 `full`
- **THEN** 系统不得把该运行改回 `fast`

### Requirement: fast 安全阻塞
系统 MUST 在 fast 无法安全简化需求时使用 `FULL_REQUIRED` 阻塞当前步骤，并等待用户显式输入 `full`；阻塞不得删除已有产物或绕过权限边界。

#### Scenario: fast 无法安全继续
- **WHEN** 需求存在影响验收标准的歧义、难以逆转的设计决策或高风险数据与权限规则
- **THEN** 系统记录 `FULL_REQUIRED`、保留检查点并停止继续实现

#### Scenario: 用户解除阻塞
- **WHEN** 用户对 `FULL_REQUIRED` 的运行输入 `full`
- **THEN** 系统升级档次、清除该阻塞并从被阻塞步骤重新开始

### Requirement: 档次不削弱质量门禁
系统 MUST 在 fast 和 full 中保留真实测试、Codex 原生审查、OCR 规则复审、状态恢复和 OpenSpec 归档。fast SHALL 通过按需读取当前阶段、复用同一审查范围与 diff、压缩重复证据来降低 Token 消耗。

#### Scenario: fast 正常完成
- **WHEN** fast 运行的需求明确且所有实现与验证门禁通过
- **THEN** 系统完成双重审查并归档 Change，而不生成重复的测试日志或审查摘要

#### Scenario: full 正常完成
- **WHEN** 用户显式升级到 full 且所有门禁通过
- **THEN** 系统执行完整澄清和设计深度后完成相同的测试、审查与归档门禁
