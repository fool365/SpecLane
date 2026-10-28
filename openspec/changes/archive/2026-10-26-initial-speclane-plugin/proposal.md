# Proposal

## Why

开发者需要一个可安装、可恢复且有明确质量门禁的 Codex 开发工作流，把一句需求稳定地推进为规范、实现、验证和交付，同时避免在非 UI 任务中强制引入 Figma。当前仓库为空，需要先形成可运行、可测试的 V1 基线。

## What Changes

- 新增可安装的 SpecLane 插件，包含主控 `speclane` Skill 和条件启用的 `ui-parser` Skill。
- 新增 Node.js 标准库实现的状态、方案哈希、UI Preflight 和交付门禁脚本。
- 使用 OpenSpec 作为 Change 规范事实源；缺失 OpenSpec 时明确阻塞。
- 将 `grill-with-docs`、`grilling`、`domain-modeling` 作为复杂澄清的固定外部 Skill 依赖；缺失时明确阻塞。
- UI 流程按 `none`、`existing`、`figma_preferred`、`figma_required` 条件分支执行。
- 新增中文 README、示例 Change、离线自动化测试和插件清单。

## Capabilities

### New Capabilities

- `workflow-orchestration`: 覆盖六阶段开发流程、条件分支、门禁、失败回退和交付规则。
- `resumable-state`: 覆盖每次运行的持久状态、原子更新、断点识别和安全续跑。
- `ui-context-gating`: 覆盖可选 UI 模式、Figma 上下文契约、冲突检查和 UI 完成证据。

### Modified Capabilities

无。

## Impact

- 新增插件清单、两个 Skill、Node.js 脚本、OpenSpec 规范、示例和测试。
- 运行时要求 Node.js 20.19.0 以上和 OpenSpec CLI。
- 复杂澄清要求外部安装三个 mattpocock/skills Skill。
- Figma MCP 和浏览器测试仅在相应 UI 任务中需要。
