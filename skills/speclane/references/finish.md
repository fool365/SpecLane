# FINISH

完成前运行 finish 门禁，确认：

- 当前方案哈希有效；
- 方案审查通过，review模式批准仍有效；
- OpenSpec tracked tasks全部完成；
- `code_review:native`、`code_review:ocr`和聚合`code_review`均通过，三个审查证据文件非空；
- `verification.md`存在且没有被隐瞒的必需失败；
- UI条件门禁通过；
- 没有未解决P0/P1冲突。

随后写 `delivery.md`：需求摘要、主要变更、真实测试、UI证据或偏差、未完成项、风险、运行和验收方式、OpenSpec状态。门禁失败时使用 `partial` 或 `blocked`，不得进入ARCHIVE。

门禁通过后顺序执行：

1. 对活动Change运行 `state begin archive`。
2. 直接调用 `openspec archive <change-id> --yes --json`，不得在Node脚本中复制归档逻辑。
3. 核对活动Change已移除、命令返回的归档目录存在，并运行OpenSpec严格验证。
4. 使用 `state pass archive --evidence=<archived-path>,openspec-strict` 记录结果。
5. 对归档后的Change路径运行 `state complete --change <archived-path>`；只有archive通过且证据非空时才能写completed。

归档失败时记录 `state block archive` 和真实错误，不得写completed。若归档期间中断，先核对活动目录和唯一匹配的归档目录：已归档则验证后补记pass，未归档才重试；状态与外部结果冲突时blocked并等待人工判断。归档不会自动删除 `.auto-dev` 运行记录。
