# Design

## Context

见 `proposal.md`。当前 CODE_REVIEW 只有聚合状态 `code_review` 和单一证据文件，`repair_attempts` 已存在但没有驱动审查修复循环；初始化器只准备 OpenSpec、三个澄清 Skill 和 SpecLane 插件。OCR Delegation Mode 可以提供确定性的文件选择和规则匹配，同时继续由宿主 Codex 做判断。

## Goals / Non-Goals

**Goals:**

- 让两轮审查使用同一份、可复核的工作区文件范围。
- 让原生审查、OCR复审和修复循环分别可恢复，并由完成门禁强制执行。
- 复用现有状态文件、三次修复上限和 Node.js 标准库实现。
- 把 OCR CLI 与委托审查 Skill 纳入一键初始化。

**Non-Goals:**

- 不为 OCR 配置独立 LLM、API Key 或远程服务。
- 不自动向 GitHub/Gitee 提交审查评论。
- 不新增并行审查、可配置严重级别或自定义重试次数。

## Decisions

### Git变更固定共同审查基线

进入 CODE_REVIEW 后先取得Git相对 `HEAD` 的全部已暂存、未暂存和未跟踪文件，再运行 `ocr delegate preview` 并逐项核对。Codex原生审查覆盖全部Git变更；第二轮对preview支持的文件运行 `ocr delegate rule <files...>`，不支持的文件必须在preview中带明确排除原因并由原生审查覆盖。preview是确定性范围准备，不属于第二轮模型审查。相比直接信任单一工具列表，这能发现过滤或工作区模式导致的静默漏项，同时允许文档变更正常交付。

### 三个状态步骤和三个证据文件

状态使用 `code_review:native`、`code_review:ocr` 和聚合 `code_review`。证据分别写入 `reviews/code-review-native.md`、`reviews/code-review-ocr.md` 和 `reviews/code-review.md`；聚合报告包含最终处置、low问题和OCR误报理由。恢复时验证已通过子步骤对应文件非空，再从最早无效步骤继续。完成门禁同时要求两个子步骤、聚合步骤和三个证据文件通过。

相比只在一个Markdown中追加章节，独立证据文件不会因第二轮中断留下难以判断是否完整的半成品，也无需增加Markdown解析器。

### 一轮收集、一次修复、完整复审

除紧急安全或数据损坏问题外，即使原生审查发现普通问题也继续OCR复审，然后合并确认有效的 critical、high、medium 问题返回 APPLY。每次修复增加 `repair_attempts`，清除三个审查步骤的通过状态；修复完成后从原生审查重新开始。已完成三次修复仍发现阻断项时写入 blocked，不执行第四次自动修复。

low 问题不触发循环。OCR误报不计入阻断项，但聚合报告必须记录原始发现和不采纳理由，避免静默丢弃。

### 扩展现有状态CLI而不新增审查执行器

在 `speclane.mjs state` 增加最小的修复循环状态操作，并扩展方案变化失效规则与 finish 门禁。审查本身仍由 Skill 指令驱动 Codex 和 `ocr delegate`，不在 Node.js 中复制模型判断或解析自然语言审查结果。

### 初始化器按需安装两类OCR依赖

初始化器在任何项目修改前检查 `ocr --version` 和委托 Skill 文件。缺少CLI时使用 npm 全局安装 `@alibaba-group/open-code-review@latest`；缺少Skill时使用现有 `skills` CLI 从 `alibaba/open-code-review` 安装 `open-code-review-delegate`。安装后分别验证 `ocr delegate preview --help` 和 Skill 文件，失败即停止。

沿用项目对OpenSpec和外部Skill的 latest 策略，并通过安装后验证降低上游变化风险；不引入运行时npm依赖。

## Risks / Trade-offs

- [两轮审查增加耗时和上下文消耗] → 使用OCR确定性文件筛选，只对当前工作区变更执行。
- [同一Codex执行两轮并非独立模型意见] → 第二轮强制应用OCR文件范围和规则，文档明确该边界。
- [OCR或Skill上游latest行为变化] → 安装后验证命令与文件，失败时阻塞而非降级为单轮。
- [升级后旧运行缺少子步骤证据] → 旧的未完成运行必须重新执行双重审查；已交付记录不自动改写。
- [工作区在两轮之间变化导致范围失效] → 若发现文件列表或diff变化，废弃本轮证据并从preview重新开始。

## Migration Plan

1. 扩展依赖清单、初始化器和preflight，并更新对应测试。
2. 更新CODE_REVIEW指令、状态操作、失效规则和finish门禁。
3. 更新测试夹具、README、插件版本和验证文档。
4. 在真实仓库运行OCR preview/rule、双重审查状态循环和一键初始化依赖检查。
5. 回滚时恢复旧门禁和指令；已安装的OCR CLI/Skill保留，不自动卸载用户依赖。
