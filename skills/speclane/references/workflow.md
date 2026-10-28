# 工作流路由

| 阶段 | 最低产物 | 退出门禁 | 失败返回 |
|---|---|---|---|
| CLARIFY | 验收标准、场景、模式、UI模式、必要的澄清检查点 | 需求可测试，关键决策已确认 | 等待用户或 BLOCKED |
| PROPOSE | `proposal.md`、`specs/`、`design.md`、`tasks.md` | OpenSpec校验通过 | CLARIFY |
| PLAN_REVIEW | `reviews/plan-review.md`、`plan_hash` | PASS；review模式批准哈希一致 | CLARIFY/PROPOSE |
| APPLY | 代码、测试、逐任务状态、必要UI证据 | 任务完成且相关测试有真实结果 | APPLY或BLOCKED |
| CODE_REVIEW | 原生审查、OCR复审、汇总报告和`verification.md` | 两个审查子步骤与汇总均通过，无阻断项，UI条件门禁通过 | APPLY/PROPOSE/CLARIFY |
| FINISH | `delivery.md` | finish门禁通过 | 对应责任阶段 |
| ARCHIVE | OpenSpec归档结果、正式规格和归档状态证据 | 归档结果可验证且`archive`步骤通过 | ARCHIVE或BLOCKED |

状态入口位于所有阶段之前。一个 Change 最多有一个未完成运行；V1 不支持同一运行并发执行。

## 工作流档次

- `fast`：新运行默认档次。只读取当前阶段需要的参考文件，产物和证据保持最短完整形式；测试、双重审查、恢复和归档门禁不变。
- `full`：仅当用户在对话中单独输入 `full` 时，通过 `state full` 单向升级当前运行。执行完整澄清和设计深度。
- 不自动升级，也不支持降级。fast 无法安全确定验收标准时，以 `FULL_REQUIRED` 阻塞当前步骤并提示用户输入 `full`。
- 状态缺少 `workflow_profile` 的旧运行按 full 恢复。

## 场景

- `bootstrap`: 用户明确创建新项目；已有重要代码时不得覆盖。
- `iteration`: 在现有行为上做最小兼容修改。
- `extension`: 新增模块或服务，同时验证项目集成契约。

场景由用户意图和仓库事实共同决定，不能只看目录是否为空。

## 模式

- `auto`: 自动方案审查 PASS 后继续。
- `review`: 自动审查 PASS 后进入 `awaiting_approval`；仅用户明确批准当前哈希后继续。

两种模式都不改变宿主权限、破坏性操作和生产动作的授权规则。
