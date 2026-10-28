# Spec Delta

## Purpose

为不同类型的界面变更提供条件化设计门禁，使后端任务不承担 UI 依赖，同时让必须遵循 Figma 的任务保留可验证的设计证据。

## ADDED Requirements

### Requirement: UI 模式分流
系统 SHALL 支持 `none`、`existing`、`figma_preferred` 和 `figma_required` 四种 UI 模式，并只执行对应级别的 UI 检查。

#### Scenario: 非 UI 需求
- **WHEN** `ui_mode` 为 `none`
- **THEN** 系统不要求 UI 上下文、Figma 或视觉验证产物

#### Scenario: 使用现有设计系统
- **WHEN** `ui_mode` 为 `existing`
- **THEN** 系统检查现有组件复用和相关 UI 测试，但不要求 Figma

### Requirement: Figma 上下文验证
系统 MUST 在 Figma 模式下验证设计引用、目标节点、解析状态和内容指纹，不得仅凭文字声明通过 UI Preflight。

#### Scenario: 强制 Figma 引用有效
- **WHEN** `ui_mode` 为 `figma_required` 且设计引用、目标节点和解析证据完整
- **THEN** 系统允许进入对应 UI 实现任务

#### Scenario: 强制 Figma 引用不可用
- **WHEN** `ui_mode` 为 `figma_required` 且 Figma 不可访问或目标节点无效
- **THEN** 系统阻塞 UI 任务

#### Scenario: 首选 Figma 降级
- **WHEN** `ui_mode` 为 `figma_preferred` 且 Figma 不可用
- **THEN** 系统仅在记录明确降级原因后允许使用现有设计系统继续

### Requirement: UI 冲突门禁
系统 MUST 阻止存在未解决 P0 或 P1 UI 冲突的任务进入实现或完成状态。

#### Scenario: 存在未解决高优先级冲突
- **WHEN** 冲突记录包含状态非 `resolved` 或 `approved` 的 P0/P1 项
- **THEN** UI Preflight 失败并返回冲突标识

### Requirement: UI 动态重新分类
系统 SHALL 在原任务未标记 UI、但实现发现必须修改界面时暂停 APPLY，更新 UI 模式并重新执行相应方案和 UI 门禁。

#### Scenario: 后端任务发现前端改动
- **WHEN** `ui_mode` 为 `none` 的实现需要修改界面
- **THEN** 系统不得直接修改 UI，而应重新规划并执行 UI Preflight

### Requirement: UI Parser 职责边界
`ui-parser` SHALL 只生成和验证设计上下文、组件映射、冲突及验证证据，不得推进主流程状态或直接修改业务代码。

#### Scenario: 设计上下文解析完成
- **WHEN** `ui-parser` 成功解析目标节点
- **THEN** 它输出结构化上下文并把流程控制权交还给 `speclane`
