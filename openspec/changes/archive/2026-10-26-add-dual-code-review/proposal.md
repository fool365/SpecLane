# Proposal

## Why

当前 SpecLane 的 CODE_REVIEW 只有一轮通用审查，既没有确定性地覆盖全部工作区变更，也无法在审查中断后区分原生审查和外部规则复审。引入 Codex 原生审查与 Alibaba Open Code Review Delegation Mode 的顺序双重审查，可提高覆盖稳定性并让修复循环可恢复、可追踪。

## What Changes

- CODE_REVIEW 先执行 Codex 原生审查，再使用 `open-code-review-delegate` 和 `ocr delegate` 完成第二轮审查。
- 两轮以当前工作区相对 `HEAD` 的已暂存、未暂存和未跟踪文件为共同基线；原生审查覆盖全部变更，OCR对受支持子集应用规则，工作区没有变更时阻塞。
- 为两轮审查分别保存可恢复状态，最终生成单一汇总；确认有效的 critical、high、medium 问题返回 APPLY，修复后重新执行两轮。
- low 问题只记录不阻塞；OCR误报保留原始发现及不采纳理由。
- 连续三轮自动修复仍未通过时阻塞并保留证据。
- `SpecLane init` 按需安装并验证 OCR CLI 与 `open-code-review-delegate` Skill。

## Capabilities

### New Capabilities

- `dual-code-review`: 定义双重代码审查顺序、范围、证据、修复循环、恢复行为和依赖准备。

### Modified Capabilities

无。

## Impact

- 修改 SpecLane 主 Skill、CODE_REVIEW/工作流/状态/完成门禁说明。
- 修改状态门禁脚本、初始化 CLI、外部依赖清单、README 与测试夹具。
- 新增运行时外部依赖 `@alibaba-group/open-code-review` 及 `open-code-review-delegate` Skill；Delegation Mode 不要求额外模型密钥。
