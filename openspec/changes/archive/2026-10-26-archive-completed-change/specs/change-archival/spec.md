# Spec Delta

## Purpose

让SpecLane在每轮功能通过实现、测试和双重代码审查后，可靠归档对应OpenSpec Change并同步正式规格，同时保留可恢复的运行状态和归档证据。

## ADDED Requirements

### Requirement: 完成后归档OpenSpec Change
系统 SHALL 在FINISH门禁通过后直接调用OpenSpec归档当前Change，并且只有归档成功后才把运行标记为completed。

#### Scenario: 正常完成并归档
- **WHEN** 当前Change的任务、验证、双重审查和FINISH门禁全部通过
- **THEN** 系统调用OpenSpec archive归档当前Change、同步正式规格、记录归档证据并完成运行

#### Scenario: 归档失败
- **WHEN** OpenSpec archive返回失败或归档结果无法验证
- **THEN** 系统保留运行记录和活动Change，并将ARCHIVE标记为blocked或failed，不得写completed

### Requirement: 归档中断可恢复
系统 MUST 在ARCHIVE中断后先核对外部归档结果，再决定补记成功或重试归档，不得仅根据本地running状态盲目重放命令。

#### Scenario: 命令成功后状态写入前中断
- **WHEN** 活动Change已不存在且匹配的归档Change及正式规格可以验证
- **THEN** 系统补记ARCHIVE通过并继续完成运行，不得再次执行归档命令

#### Scenario: 命令执行前中断
- **WHEN** 活动Change仍存在且没有匹配的归档结果
- **THEN** 系统将ARCHIVE恢复为可重试状态并重新调用OpenSpec archive

### Requirement: 保留运行记录
系统 SHALL 在归档Change后保留 `.auto-dev` 中的状态和交付证据，不得因OpenSpec归档自动删除运行历史。

#### Scenario: 查询已归档运行
- **WHEN** 用户在归档完成后检查对应运行记录
- **THEN** 状态文件仍可读取，并包含通过的ARCHIVE步骤和归档证据
