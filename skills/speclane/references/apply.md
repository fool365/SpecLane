# APPLY

按 `tasks.md` 的任务顺序实施。每个任务开始前记录 `state begin apply:<task-id>`，实现和验证通过后记录 `state pass`。

## UI Preflight

- `none`: 跳过。
- `existing`: 扫描现有组件、tokens和测试；不加载Figma。
- `figma_preferred` / `figma_required`: 加载 `$ui-parser` 的 `implementation` 档位并运行 UI 门禁。

实现中发现未计划的UI影响时，停止当前任务，更新UI模式与OpenSpec方案，重新执行 PLAN_REVIEW。

## 实现和测试

- 保护用户现有改动，修改前检查工作树和调用方。
- 复用仓库既有模式和依赖，完成任务需要的代码、调用方、配置、测试和文档。
- 先运行相关基线测试；之后执行格式、静态检查、单元、集成、构建和必要E2E。
- 失败只做有限根因修复；默认连续三轮后阻塞并保留证据。
- 不删除测试、不弱化断言、不隐藏失败、不把未运行检查写成 PASS。
