# Spec Delta

## Purpose

为 SpecLane 的代码交付提供顺序明确、范围确定、可恢复且能自动闭环修复的双重审查能力，同时保留每轮审查和误报处置证据。

## ADDED Requirements

### Requirement: 顺序执行双重审查
系统 SHALL 在 CODE_REVIEW 中先由 Codex 原生能力审查，再使用 Open Code Review Delegation Mode 执行第二轮审查；除必须立即停止的安全或数据损坏问题外，第一轮发现普通问题时 MUST 继续完成第二轮。

#### Scenario: 两轮均完成
- **WHEN** 当前变更进入 CODE_REVIEW 且第一轮没有必须立即停止的问题
- **THEN** 系统先完成 Codex 原生审查，再执行 OCR 文件预览、规则解析和第二轮审查

#### Scenario: 第一轮发现紧急问题
- **WHEN** Codex 原生审查发现继续执行可能扩大安全影响或数据损坏的问题
- **THEN** 系统立即停止审查并返回 APPLY，不得执行第二轮

### Requirement: 审查完整工作区变更
系统 MUST 让两轮审查覆盖当前工作区相对 `HEAD` 的全部已暂存、未暂存和未跟踪文件，并使用相同的审查范围。

#### Scenario: 工作区包含多种状态文件
- **WHEN** 工作区同时包含已暂存、未暂存和未跟踪文件
- **THEN** 系统核对Git与OCR预览范围，Codex原生审查覆盖全部Git变更，OCR规则复审覆盖受支持文件且为其他文件保留明确排除原因

#### Scenario: 工作区没有变更文件
- **WHEN** Git相对 `HEAD` 没有已暂存、未暂存或未跟踪文件
- **THEN** 系统以 `NO_REVIEWABLE_CHANGES` 阻塞，不得生成审查 PASS

#### Scenario: OCR预览遗漏文件
- **WHEN** Git变更文件既未被OCR预览列为可处理文件，也没有明确排除原因
- **THEN** 系统以 `REVIEW_SCOPE_MISMATCH` 阻塞，不得开始两轮审查

### Requirement: 按严重级别闭环修复
系统 MUST 将确认有效的 critical、high、medium 问题视为阻断项并返回 APPLY；修复后 SHALL 从 Codex 原生审查重新开始两轮审查。low 问题 MUST 记录但不得单独阻断交付。

#### Scenario: 存在阻断问题
- **WHEN** 任一轮审查产生确认有效的 critical、high 或 medium 问题
- **THEN** 系统合并两轮问题、执行一次修复并重新运行完整双重审查

#### Scenario: 仅存在低级别问题
- **WHEN** 两轮审查只产生 low 问题
- **THEN** 系统记录问题并允许 CODE_REVIEW 通过

#### Scenario: 连续修复未通过
- **WHEN** 连续三轮自动修复后仍存在阻断问题
- **THEN** 系统保留全部审查证据并将 CODE_REVIEW 标记为 blocked

### Requirement: 保存可恢复的审查证据
系统 SHALL 分别保存 Codex 原生审查、OCR复审和最终汇总状态；中断恢复时 MUST 验证已完成步骤的证据，并从最早未完成或无效的步骤继续。

#### Scenario: 第二轮审查中断
- **WHEN** `code_review:native` 已通过而 `code_review:ocr` 在运行中断开
- **THEN** 系统验证第一轮证据后从 `code_review:ocr` 恢复，不得无条件重放已通过步骤

#### Scenario: OCR发现被判定为误报
- **WHEN** OCR提出的问题经上下文核对后不成立
- **THEN** 汇总报告保留原始发现和不采纳理由，并且该发现不计入阻断项

### Requirement: 一键准备审查依赖
系统 MUST 在 `SpecLane init` 中检查 OCR CLI 和 `open-code-review-delegate` Skill，只安装缺失项并在继续初始化前验证其可用性。

#### Scenario: 审查依赖缺失
- **WHEN** 用户运行 `SpecLane init` 且 OCR CLI 或委托审查 Skill 缺失
- **THEN** 系统安装对应依赖、验证 `ocr delegate` 与 Skill 后继续初始化

#### Scenario: 审查依赖安装失败
- **WHEN** OCR CLI 或委托审查 Skill 安装或验证失败
- **THEN** 系统停止后续步骤并返回非零退出状态和失败原因
