# PROPOSE

OpenSpec 是规范事实源。项目首次接入的用户入口是 `SpecLane init <project>`，不得要求用户直接执行 `openspec init`。进入方案阶段前必须确认 `openspec --version` 成功；缺失时记录 `OPENSPEC_NOT_FOUND` 并停止，不手工声称兼容成功。

优先使用当前版本 CLI：

```text
openspec new change <change-id>
openspec instructions <artifact> --change <change-id>
openspec validate <change-id> --type change --strict --no-interactive
```

依次生成 `proposal.md`、`specs/`、`design.md`、`tasks.md`，一次只请求并读取当前 artifact 的 instructions，遵循模板和依赖顺序。fast 使用满足模板的最短完整内容；full 补足复杂决策的设计深度。任务必须可验证；UI任务使用 `[UI:<ui-ref-id>]` 标记。`ui_mode=none` 时不创建UI依赖。

SpecLane旁路产物放在同一Change下的 `reviews/`、`ui/`、`verification.md` 和 `delivery.md`，不得冒充 OpenSpec 内置字段。
