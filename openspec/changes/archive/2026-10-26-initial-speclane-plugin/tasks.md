# Tasks

## 1. 插件与 Skill 骨架

- [x] 1.1 创建便携 `plugin.json`、Codex 兼容清单和 marketplace 元数据，并通过 JSON 解析检查验证清单有效
- [x] 1.2 创建 `speclane` 与 `ui-parser` Skill、UI 元数据和渐进式参考文档，并使用无依赖Skill结构校验器验证结构
- [x] 1.3 编写中文 README、依赖安装和完整流程说明，并逐条核对命令与实际文件路径

## 2. 状态与方案门禁

- [x] 2.1 实现 Node.js 状态初始化、原子更新、备份和恢复命令，并通过状态单元测试
- [x] 2.2 实现稳定方案哈希、审批失效和计划门禁，并通过哈希及 review 模式测试
- [x] 2.3 实现 Node/OpenSpec 环境探测、项目事实检测和固定 Skill 依赖声明，并验证缺失依赖返回明确阻塞结果

## 3. UI 条件门禁

- [x] 3.1 实现 `ui-context.json` 契约校验，并通过四种 UI 模式测试
- [x] 3.2 实现组件映射、设计指纹和 P0/P1 冲突门禁规则，并通过有效、降级和阻塞 fixture 测试
- [x] 3.3 将 UI Preflight 集成到主 CLI，验证 `none` 不依赖 Figma、`figma_required` 缺证据时失败

## 4. 完成门禁与示例

- [x] 4.1 实现任务、代码审查、验证证据和 UI 条件完成门禁，并通过端到端离线测试
- [x] 4.2 添加纯后端和 Figma UI 两类示例 Change，验证示例契约可被脚本读取
- [x] 4.3 执行 Node 测试、OpenSpec严格校验和插件/Skill结构校验，记录真实结果

## Workflow follow-up

- 质量门禁全部通过后归档本 Change。
- 在具备 Figma 授权的环境中补充真实 MCP 集成验证。
