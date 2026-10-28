# Tasks

## 1. 审查依赖准备

- [x] 1.1 扩展 `SpecLane init` 与外部依赖清单，按需安装并验证 OCR CLI 和 `open-code-review-delegate` Skill；用CLI单元测试覆盖首次安装、已存在跳过和失败停止
- [x] 1.2 扩展 preflight 与插件清单校验，使缺少 OCR 或委托 Skill 时明确阻塞；用门禁测试和 `npm run validate:plugin` 验证

## 2. 双重审查状态与门禁

- [x] 2.1 更新 SpecLane/CODE_REVIEW/状态/完成说明，定义共同preview范围、原生审查、OCR复审、严重级别、误报留痕和恢复顺序，并通过文档一致性检查验证
- [x] 2.2 实现审查修复状态操作、方案变化失效规则与 finish 双子步骤门禁；用状态和门禁测试覆盖中断恢复、证据缺失、三次修复阻塞及完整通过

## 3. 集成与交付入口

- [x] 3.1 更新测试夹具、中文 README 和插件版本，说明一键依赖准备、双重审查循环及升级行为；用完整测试和插件校验验证
- [x] 3.2 在真实工作区执行 `ocr delegate preview`/`rule`、双重审查证据与状态循环，并运行 OpenSpec 严格校验，记录真实命令、结果和未执行项

## Workflow follow-up

- 完成实现与双重代码审查后再归档此 Change。
