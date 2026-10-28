# Design

## Context

仓库当前为空，见 `proposal.md`。V1 必须作为可安装插件分发，同时把运行状态和 OpenSpec Change 留在目标项目。OpenSpec 当前要求 Node.js 20.19.0 以上，因此确定性脚本统一使用 Node.js 标准库。Codex Skill 不能被当作通用 RPC 或持久工作流引擎，关键门禁必须由脚本和文件证据落实。

## Goals / Non-Goals

**Goals:**

- 形成可安装、可发现的便携插件包。
- 用一个主控 Skill 协调六阶段流程，用一个 UI Skill 规范化设计上下文。
- 为每次运行提供原子状态、断点恢复和失效检查。
- 以无第三方 Node 依赖的脚本验证方案、UI和交付门禁。
- 提供中文使用文档、离线测试和两个最小示例。

**Non-Goals:**

- 不实现后台守护、多 Agent 调度、自动生产部署或外部操作回滚。
- 不复制 OpenSpec 引擎，也不实现通用 Figma 解析服务。
- 不自动安装全局依赖，不自动创建 Git 分支、提交或推送。
- 不实现像素级视觉差异算法。

## Decisions

### 使用便携插件根目录

根目录提供 `plugin.json`，Skill 位于 `skills/`；同时提供 Codex 兼容清单和本地 marketplace 元数据。相比把 Skill 复制到每个业务仓库，这能集中升级插件，而运行产物仍写入目标项目。

### 固定外部澄清 Skill

复杂 CLARIFY 必须使用 `grill-with-docs` 及其 `grilling`、`domain-modeling` 依赖。插件清单目前不能声明 Skill 对 Skill 的可安装依赖，因此由主 Skill 在宿主可用 Skill 列表中验证，缺失时阻塞。替代方案是复制上游内容，但会增加许可证、同步和行为漂移成本，因此不采用。

### OpenSpec 为硬依赖

启动时执行版本探测；缺失时输出阻塞状态和安装指引，不手工伪造 OpenSpec 成功。SpecLane 只在 OpenSpec 管理的 Change 旁增加 review、UI和delivery文件。

### Node.js 标准库脚本

脚本使用 `.mjs`、`node:test`、`node:crypto`、`node:fs` 和 `node:child_process`，不引入 YAML、CLI或测试框架依赖。机器契约统一使用 JSON；Markdown仅承载人读文档。

### 一个确定性 CLI

`skills/speclane/scripts/speclane.mjs` 以子命令承担环境探测、状态迁移、方案哈希和门禁。UI契约验证保留在 `ui-parser` Skill 内，并由主 CLI 导入复用，避免重复校验规则。

### 状态与事实分离

OpenSpec 是需求事实源；Figma 是设计事实源；`state.json` 只记录运行控制和指纹。状态写入使用临时文件、同步、备份和替换。恢复时先验证产物，不依据状态文字盲目重试。

### UI 是条件分支

`none` 完全跳过UI；`existing`使用现有设计系统；两个Figma模式才加载 `ui-parser`。`figma_preferred`允许有证据的降级，`figma_required`缺少有效证据即阻塞。

## Risks / Trade-offs

- [宿主无法程序化枚举外部 Skill] → 主 Skill 根据宿主提供的可用 Skill 清单检查，并在 README 中给出安装步骤。
- [OpenSpec 版本行为变化] → 记录实际版本，优先使用稳定 CLI 命令，失败时保留真实错误。
- [状态文件与工作区不一致] → 恢复时重新计算方案哈希并检查任务、代码和验证证据。
- [同一运行并发写入] → V1 明确不支持同一 `run_id` 并发；原子写入避免半文件，但不提供分布式锁。
- [Figma 集成在离线环境不可验证] → 通过固定 JSON fixture 测试契约，并在交付中区分协议测试与真实 MCP 验证。

## Migration Plan

1. 安装 Node.js、OpenSpec 和固定外部 Skill。
2. 通过 marketplace 或本地插件目录安装 SpecLane。
3. 在目标项目调用 `$speclane`；首次运行创建 OpenSpec Change 和状态目录。
4. 如需移除，仅卸载插件；目标项目中的规范和运行记录不会被自动删除。
