# Spec Delta

## Purpose

为首次使用和新项目接入提供一个统一、可重复执行的 SpecLane 初始化入口，隐藏底层 OpenSpec 与外部 Skill 的分散安装步骤。

## ADDED Requirements

### Requirement: 统一初始化命令
系统 SHALL 提供 `SpecLane init [目录]` 命令，并提供等价的小写 `speclane init [目录]` 入口；未提供目录时 MUST 使用当前工作目录。

#### Scenario: 初始化当前目录
- **WHEN** 用户执行 `SpecLane init`
- **THEN** 系统初始化当前工作目录并显示各步骤结果

#### Scenario: 初始化指定目录
- **WHEN** 用户执行 `SpecLane init <目录>`
- **THEN** 系统初始化解析后的目标目录

### Requirement: 一键准备可安装依赖
系统 MUST 在初始化前检查 OpenSpec、三个固定澄清 Skill 和 SpecLane Marketplace 插件，并只安装缺失项。

#### Scenario: 首次安装
- **WHEN** 用户环境具备 Node.js、npm、npx、Git 和 Codex，但缺少可安装依赖
- **THEN** 系统安装 OpenSpec、`grill-with-docs`、`grilling`、`domain-modeling` 和 SpecLane 插件后继续初始化

#### Scenario: 依赖已经存在
- **WHEN** 所有依赖已经可用
- **THEN** 系统跳过安装且不覆盖现有依赖

### Requirement: 使用 OpenSpec 初始化能力
系统 MUST 通过内部调用 OpenSpec 为 Codex 初始化目标项目，用户无需直接执行 `openspec init`。

#### Scenario: 新项目初始化成功
- **WHEN** 依赖准备完成且目标项目尚未初始化 OpenSpec
- **THEN** 系统使用 Codex 工具配置和中文语言设置初始化项目

#### Scenario: 项目已经初始化
- **WHEN** 目标目录已经包含 OpenSpec 配置
- **THEN** 系统报告已初始化并成功结束，不得覆盖已有配置

### Requirement: 前置条件和失败可诊断
系统 MUST 在缺少 Node.js、npm、npx、Git 或 Codex 等不可代装的前置条件，或任一子命令失败时停止，并返回非零退出状态和失败步骤。

#### Scenario: 缺少不可代装前置条件
- **WHEN** 初始化环境缺少必需的宿主命令
- **THEN** 系统不继续修改环境，并明确列出缺失命令

#### Scenario: 子命令失败
- **WHEN** 依赖安装或 OpenSpec 初始化命令失败
- **THEN** 系统停止后续步骤并保留该命令的错误输出
