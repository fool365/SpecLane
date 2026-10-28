# Delivery

SpecLane 0.4.1 修复了初始化成功后仍误报缺少 `grill-with-docs` 的问题。

## 主要变更

- preflight 对 `grill-with-docs` 同时接受宿主列表或受支持全局目录中的安装文件。
- `grilling`、`domain-modeling` 和 `open-code-review-delegate` 仍必须由宿主报告为可调用。
- Skill 说明明确组合 Skill 不直接调用，复杂澄清直接使用其两个可见子 Skill。
- 新增已安装但隐藏、真正缺失两种回归测试。

## 验证

- 全量测试 29/29 通过。
- 插件校验通过，版本 0.4.1。
- OpenSpec Change 严格校验通过。
- Codex 原生审查和 OCR 委托审查通过。
- `ui_mode=none`，无 UI/Figma 工作。

## 使用

升级 SpecLane 插件或全局命令后，重新打开 Codex 会话。现有项目无需重新执行 `SpecLane init`；preflight 会识别此前已经安装的 `grill-with-docs`。
