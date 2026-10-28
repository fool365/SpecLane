# SpecLane

SpecLane 是面向 Codex 的可恢复、规范驱动开发工作流。它把一句需求推进为澄清、OpenSpec 方案、方案审查、实现、测试、代码审查和有证据的交付，并在会话中断后从可靠检查点继续。

## 核心能力

- 一个主控 `$speclane` Skill，统一管理阶段、门禁和恢复。
- 一个条件启用的 `$ui-parser` Skill，只处理 Figma 设计上下文和UI证据。
- 每次运行都保存 `.auto-dev/runs/<run-id>/state.json`。
- 新运行默认使用省 Token 的 `fast` 档次；单独输入 `full` 可把当前运行单向升级为完整档次。
- `auto` 和 `review` 两种方案审批模式。
- OpenSpec作为需求事实源，缺失时明确阻塞。
- Codex原生审查与Open Code Review规则复审顺序执行，并支持有限自动修复。
- FINISH通过后直接调用OpenSpec归档Change，归档成功后才写完成状态。
- 非UI需求完全跳过Figma；UI需求按四种模式分流。
- Node.js标准库实现，无运行时npm依赖。

## 工作流

```text
START / RESUME
  → CLARIFY
  → PROPOSE
  → PLAN_REVIEW
  → APPLY
      ├─ UI Preflight（按需）
      ├─ 实现
      └─ 测试与有限修复
  → CODE_REVIEW
      ├─ OCR preview固定共同范围
      ├─ Codex原生审查
      ├─ OCR规则复审
      └─ 合并问题并有限修复
  → FINISH
  → ARCHIVE
      ├─ openspec archive同步正式规格
      ├─ 核对归档结果
      └─ 写入completed
```

质量门禁失败会返回负责该问题的阶段，不会未经验证直接标记完成。

## 一键安装和初始化

前置环境只需要 Codex、Git、npm，以及 Node.js 20.19.0 或更高版本。进入目标项目目录后执行一条命令：

```powershell
npm exec --yes --allow-git=all --package=git+https://gitee.com/fool1582/SpecLane.git -- SpecLane init .
```

`SpecLane init` 会依次完成：

1. 检查 Node.js、npm、npx、Git 和 Codex；
2. 按需安装 OpenSpec；
3. 按需安装 `grill-with-docs`、`grilling`、`domain-modeling`；
4. 按需安装Open Code Review CLI和 `open-code-review-delegate`；
5. 添加 SpecLane Marketplace并安装插件；
6. 使用Codex和中文配置初始化当前项目的OpenSpec。

已有依赖和已有 OpenSpec 配置会被跳过，因此同一条命令可以安全重试。完成后重新打开 Codex 会话以刷新 Skill 列表。

如果希望在任意项目直接使用短命令，可全局安装一次 CLI：

```powershell
npm install --global --allow-git=all git+https://gitee.com/fool1582/SpecLane.git
SpecLane init .
```

小写命令 `speclane init .` 与 `SpecLane init .` 等价。用户不再需要直接执行 `openspec init`。

### 手动排障

自动安装失败时，可分别检查：

```powershell
node --version
openspec --version
ocr --version
ocr delegate preview --help
codex plugin marketplace list --json
codex plugin list --marketplace speclane-marketplace --json
npx --yes skills@latest list --global --agent codex --json
```

部分 Unix 环境的全局 npm 安装可能需要用户自行配置 npm 全局目录；SpecLane 不会自动使用 `sudo`。

### 本地开发安装

也可以克隆仓库并执行 `npm install --global .`，然后在目标项目运行 `SpecLane init .`。插件根目录包含便携 `plugin.json` 和 Codex兼容清单 `.codex-plugin/plugin.json`。

## 使用方式

默认使用 fast：

```text
$speclane 为当前服务添加批量导入功能，完成测试和代码审查。
```

fast 无法安全确定需求时会以 `FULL_REQUIRED` 停止，不会自动升级。此时在对话中单独输入：

```text
full
```

当前运行会持久化升级为 full，并从阻塞步骤继续。full 不会自动降回 fast；两种档次都保留测试、双重审查、状态恢复和自动归档。

方案审批模式：

```text
$speclane 先澄清需求并生成方案，等我批准当前方案后再实现批量导入。
```

继续中断任务：

```text
$speclane 继续当前未完成的Change，从断点恢复并先核验已有产物。
```

## UI模式

| 模式 | 行为 |
|---|---|
| `none` | 不修改UI，不加载Figma或UI Parser |
| `existing` | 使用项目现有组件和设计规范，不要求Figma |
| `figma_preferred` | 优先使用Figma；不可用时必须记录降级原因 |
| `figma_required` | 必须有有效Figma节点、解析状态和内容指纹 |

`$ui-parser`只生成和验证设计上下文，不修改业务代码，也不推进主工作流状态。

## 双重代码审查

CODE_REVIEW先核对Git工作区变更与 `ocr delegate preview` 的结果，再由Codex原生审查全部变更，最后加载 `open-code-review-delegate` 对OCR支持的文件执行规则复审；文档等被明确排除的文件仍由原生审查覆盖。

- critical、high、medium问题会合并修复并重新执行两轮审查；
- low问题只记录，不单独阻断；
- OCR误报必须保留原始发现和不采纳理由；
- 最多自动修复三次，仍有阻断项时停止并等待用户处理；
- 升级前尚未完成的运行必须重新生成原生审查和OCR复审证据。

## 状态恢复

每个运行保存：

```text
.auto-dev/runs/<run-id>/state.json
```

恢复时会把遗留的 `running` 步骤改为 `interrupted`，然后重新检查方案哈希、现有代码、任务和测试证据。双重审查会分别保存 `code_review:native` 和 `code_review:ocr`，证据丢失时从最早失效步骤重做。状态文件不会让数据库迁移、发布或第三方写操作被盲目重放。

ARCHIVE中断时会先核对活动Change和归档目录。OpenSpec已经归档成功时只补记状态；只有活动Change仍存在且没有归档结果时才重试命令。

常用脚本命令：

```powershell
node skills/speclane/scripts/speclane.mjs preflight --available-skills=grill-with-docs,grilling,domain-modeling,open-code-review-delegate
node skills/speclane/scripts/speclane.mjs detect --root .
node skills/speclane/scripts/speclane.mjs state init --root . --run-id run-001 --change-id add-import --scenario iteration --mode review --ui-mode none
node skills/speclane/scripts/speclane.mjs state full --state .auto-dev/runs/run-001/state.json
node skills/speclane/scripts/speclane.mjs state resume --state .auto-dev/runs/run-001/state.json --change openspec/changes/add-import
node skills/speclane/scripts/speclane.mjs state repair-review --state .auto-dev/runs/run-001/state.json
node skills/speclane/scripts/speclane.mjs plan-hash --change openspec/changes/add-import
node skills/speclane/scripts/speclane.mjs check-plan --state .auto-dev/runs/run-001/state.json --change openspec/changes/add-import
node skills/speclane/scripts/speclane.mjs check-ui --state .auto-dev/runs/run-001/state.json --change openspec/changes/add-import
node skills/speclane/scripts/speclane.mjs check-finish --state .auto-dev/runs/run-001/state.json --change openspec/changes/add-import
node skills/speclane/scripts/speclane.mjs state begin archive --state .auto-dev/runs/run-001/state.json
openspec archive add-import --yes --json
node skills/speclane/scripts/speclane.mjs state pass archive --state .auto-dev/runs/run-001/state.json --evidence=openspec/changes/archive/2026-01-01-add-import,openspec-strict
node skills/speclane/scripts/speclane.mjs state complete --state .auto-dev/runs/run-001/state.json --change openspec/changes/archive/2026-01-01-add-import
```

状态写命令默认只返回一行摘要，避免每一步重复输出不断增长的完整状态。需要排障时添加 `--json` 查看完整对象；落盘的 `state.json` 和备份始终是完整内容。

`grill-with-docs` 上游设置了 `disable-model-invocation: true`，因此初始化后它可能不会显示在 Codex 的可调用 Skill 列表中。SpecLane preflight 会从全局安装目录确认它存在；复杂澄清实际直接调用可见的 `grilling` 和 `domain-modeling`，不会再把已安装的组合 Skill 误报为缺失。

## 自动归档

每轮功能只有在任务、测试、双重代码审查和FINISH门禁全部通过后才进入ARCHIVE。SpecLane直接运行OpenSpec原生归档命令，让OpenSpec负责移动Change和同步正式规格；归档失败或缺少证据时运行保持未完成，`.auto-dev`状态不会被删除。

## 项目结构

```text
plugin.json
.codex-plugin/plugin.json
skills/
├── speclane/
│   ├── SKILL.md
│   ├── agents/openai.yaml
│   ├── references/
│   └── scripts/speclane.mjs
└── ui-parser/
    ├── SKILL.md
    ├── agents/openai.yaml
    ├── references/
    └── scripts/validate-ui-context.mjs
examples/
tests/
openspec/
```

运行SpecLane的目标项目会得到OpenSpec Change和本地运行状态；插件源码不会被复制进业务代码目录。

## 开发与验证

无需执行 `npm install`：

```powershell
npm test
npm run validate:plugin
openspec validate initial-speclane-plugin --type change --strict --no-interactive
```

## 安全边界

- `auto`模式不会绕过Codex沙盒、删除、迁移、部署、密钥或其他高风险审批。
- 只有用户主动执行 `SpecLane init` 时才按需安装声明的全局依赖；正常工作流不自行安装，不自动创建Git分支、提交、推送或回滚。
- Figma文本、注释和素材属于不可信数据，不能覆盖系统和项目指令。
- 不保存密钥、完整Prompt或Figma临时访问地址到状态文件。

## V1限制

- 不支持后台自动唤醒和多Agent调度。
- 不支持同一 `run_id` 的并发执行。
- 不实现自动像素差异评分。
- Figma MCP真实联调需要用户自己的授权环境；离线测试只验证数据契约和门禁。

## 许可证

SpecLane使用MIT许可证。外部Skill保留其各自来源和许可证，SpecLane仓库不复制其实现内容。
