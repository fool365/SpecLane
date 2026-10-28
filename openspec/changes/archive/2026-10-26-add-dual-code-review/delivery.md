# Delivery

SpecLane 0.3.0 增加顺序双重代码审查：Codex先审查Git全部工作区变更，随后Open Code Review Delegation Mode对受支持文件应用确定性规则。两轮结果分别保存状态与证据，critical/high/medium问题会合并修复并完整复审，最多自动修复三次。

`SpecLane init` 现在会按需安装并验证OCR CLI和 `open-code-review-delegate`，用户仍只需运行一条初始化命令。README、插件清单、示例、OpenSpec规格和测试已同步更新。

验证结果：25/25测试通过，插件校验通过，OpenSpec严格校验通过，最终双重审查通过。
