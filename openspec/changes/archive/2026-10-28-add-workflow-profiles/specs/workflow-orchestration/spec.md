# Spec Delta

## ADDED Requirements

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
