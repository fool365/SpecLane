# 状态契约

每次运行保存到 `.auto-dev/runs/<run-id>/state.json`。

```json
{
  "schema_version": 1,
  "run_id": "run-001",
  "change_id": "add-user-import",
  "workflow_profile": "fast",
  "scenario": "iteration",
  "execution_mode": "review",
  "ui_mode": "none",
  "status": "running",
  "current_step": "clarify",
  "plan_hash": null,
  "approval": {
    "approved": false,
    "approved_plan_hash": null,
    "evidence": null
  },
  "repair_attempts": 0,
  "steps": {
    "clarify": {"status": "running", "attempts": 1}
  },
  "last_error": null,
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>"
}
```

全局状态：`running`、`awaiting_user_input`、`awaiting_approval`、`blocked`、`partial`、`completed`。

步骤状态：`pending`、`running`、`interrupted`、`passed`、`failed`、`blocked`、`awaiting_user_input`、`awaiting_approval`。

## 更新规则

1. 步骤开始前写 `running` 并增加 `attempts`。
2. 产物通过门禁后才能写 `passed`。
3. 覆盖前保存 `state.json.bak`，用同目录临时文件完成替换。
4. 恢复时把遗留 `running` 改为 `interrupted`，不自动把等待或阻塞状态改成运行。
5. 方案哈希变化时，清除批准并让 PLAN_REVIEW 之后的完成结果失效。
6. 状态中不保存密钥、完整 Prompt、Figma 临时访问地址或敏感业务数据。

## 档次和命令输出

- 新状态写入 `workflow_profile: fast`；旧状态没有该字段时按 full 解释，并在 `state resume` 时迁移落盘。
- 用户单独输入 `full` 时执行 `state full --state <path>`。该操作幂等；若当前错误为 `FULL_REQUIRED`，把阻塞步骤改为 `interrupted`、清除错误并继续恢复。
- 没有 fast 降级命令，也没有自动升级路径。
- 状态写命令默认返回单行摘要。排障或读取完整步骤历史时显式加 `--json`；状态文件和备份始终保存完整 JSON。

## 双重代码审查状态

- `code_review:native`：Codex原生审查，对应 `reviews/code-review-native.md`。
- `code_review:ocr`：加载 `$open-code-review-delegate` 后执行的OCR规则复审，对应 `reviews/code-review-ocr.md`。
- `code_review`：两轮结果、low问题和误报理由的最终汇总，对应 `reviews/code-review.md`。

恢复时使用 `state resume --change <change-path>` 验证已通过子步骤的证据文件；缺失或范围已变化时将该步骤及后续步骤视为待执行。确认存在critical、high或medium问题后增加 `repair_attempts`，把三个审查步骤重置为pending并返回APPLY。最多执行三次自动修复，仍不通过则把 `code_review` 标记为blocked。

## 归档状态

- `archive`：OpenSpec归档外部写操作，对应归档目录路径和验证结果证据。
- `completed`只允许在`archive`为passed且证据非空后写入；否则使用 `OPENSPEC_ARCHIVE_NOT_PASSED` 或 `OPENSPEC_ARCHIVE_EVIDENCE_REQUIRED` 阻塞。
- 方案哈希变化时，`archive`与FINISH之后的结果一并失效。

恢复时若`archive`为running或interrupted，先核对活动Change和 `openspec/changes/archive/*-<change-id>`。已存在唯一有效归档结果时补记pass；仅活动Change存在时才重试；两边同时存在或都不存在时blocked。不得仅因本地状态是running而重放 `openspec archive`。
