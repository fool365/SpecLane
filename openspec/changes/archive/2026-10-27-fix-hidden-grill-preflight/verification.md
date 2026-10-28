# Verification

- `node --test tests/gates.test.mjs`：14/14 通过，覆盖组合 Skill 可见、已安装但隐藏、实际缺失三种情况。
- `npm test`：29/29 通过。
- `node skills/speclane/scripts/speclane.mjs preflight --available-skills=grilling,domain-modeling,open-code-review-delegate`：通过；已安装但隐藏的 `grill-with-docs` 不再误报缺失。
- `npm run validate:plugin`：通过，插件版本 0.4.1。
- `openspec validate fix-hidden-grill-preflight --type change --strict --no-interactive`：通过。
- OCR workspace preview：15 个变更文件全部被纳入或明确以 `unsupported_ext` 排除；7 个可审查文件规则复审通过。
- UI/Figma：`ui_mode=none`，未执行且不需要。
