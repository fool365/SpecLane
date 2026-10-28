# CODE_REVIEW

CODE_REVIEW必须顺序执行两轮，使用同一份Git工作区变更作为基线。先取得Git相对 `HEAD` 的已暂存、未暂存和未跟踪文件，再运行一次 `ocr delegate preview`。逐项核对两份结果：每个Git变更文件必须被preview列为可审查文件，或带有明确的排除原因；无法解释的遗漏以 `REVIEW_SCOPE_MISMATCH` 阻塞。文档等 `unsupported_ext` 文件仍由Codex原生审查和文档校验覆盖。Git工作区没有变更文件时以 `NO_REVIEWABLE_CHANGES` 阻塞，不得写PASS。

在同一轮审查中缓存preview范围、diff和已读取文件内容，原生审查与OCR复审必须复用，不得为第二轮重新读取同一内容。只有恢复后范围哈希或证据失效时才重新取得。三个证据文件分别记录本步骤新增信息：原生发现、OCR发现、最终汇总；不要复制测试日志或另一份审查的全文。

## 1. Codex原生审查

记录 `state begin code_review:native`，审查Git变更范围内的全部文件及必要上下文，并写入 `reviews/code-review-native.md`。至少覆盖：

1. **Spec**：实现是否逐条满足验收标准。
2. **Standards**：diff、安全、错误处理、兼容性、类型、复杂度和必要性。
3. **Tests**：真实命令、退出状态、通过/失败数量及未执行项。
4. **UI/Figma**：仅对应UI模式需要时执行。

除继续执行会扩大安全影响或数据损坏的问题外，即使发现普通问题也完成第二轮。证据完成后记录 `state pass code_review:native`。

## 2. OCR规则复审

加载 `$open-code-review-delegate`，记录 `state begin code_review:ocr`，然后：

1. 对preview返回的全部文件运行 `ocr delegate rule <files...>`。
2. 按规则取得每个文件的diff或未跟踪文件全文。
3. 使用Codex逐文件复审，输出path、content、行号、category和severity。
4. 丢弃明显误报前必须核对上下文，并把原始发现和不采纳理由写入 `reviews/code-review-ocr.md`。

证据完成后记录 `state pass code_review:ocr`。Delegation Mode只让OCR负责确定性文件选择和规则解析，不配置第二个模型或API Key。

## 3. 汇总与修复循环

将两轮发现写入 `reviews/code-review.md`：

- 确认有效的critical、high、medium是阻断项；
- low只记录，不单独阻断；
- OCR误报保留原始发现和不采纳理由；
- 代码问题返回APPLY，设计问题返回PROPOSE，需求冲突返回CLARIFY。

存在阻断项时先完成两轮再统一修复，调用审查修复状态操作增加计数并清除三步审查结果；修复后从preview和原生审查重新开始。三次自动修复后仍有阻断项则blocked。没有阻断项时记录 `state pass code_review`。

恢复时验证已通过步骤的证据文件和preview范围；从最早未完成或证据失效的步骤继续，不无条件重放外部命令。视觉相似不能代替功能通过，浏览器不可用时必须标明视觉验证未执行。
