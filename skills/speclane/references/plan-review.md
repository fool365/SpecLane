# PLAN_REVIEW

审查结果只能是 `PASS`、`CHANGES_REQUIRED`、`BLOCKED`。

检查：

- 需求和异常边界是否可测试；
- specs、design、tasks是否互相覆盖；
- 场景和项目约束是否一致；
- API、数据、权限、兼容性和不可逆风险是否识别；
- UI模式、设计引用和组件风险是否合理；
- 测试计划是否能证明验收标准。

方案哈希覆盖按路径排序后的：`proposal.md`、`design.md`、`tasks.md`、`specs/**/*`，以及存在时的 `ui/ui-context.json`。`tasks.md` 的勾选状态在计算前统一归一化，完成任务不会让批准失效；任务内容变化仍会改变哈希。哈希不包含审查文本、时间戳、截图、状态文件或Figma临时响应。

`review` 模式只有在用户明确批准且 `approved_plan_hash` 等于当前哈希时才能进入 APPLY。Agent的自我评价不能代替用户批准。
