# UI上下文契约

`ui-context.json` 最小结构：

```json
{
  "schema_version": 1,
  "change_id": "add-user-management",
  "ui_mode": "figma_required",
  "references": [
    {
      "id": "UI-USER-LIST",
      "provider": "figma",
      "url": "https://www.figma.com/design/FILE/Example?node-id=42-15",
      "file_key": "FILE",
      "node_id": "42:15",
      "route": "/users",
      "requirement_ids": ["REQ-001"],
      "states": ["default", "loading", "empty", "error"],
      "responsive": ["desktop", "mobile"],
      "validation_status": "valid",
      "parse_status": "resolved",
      "content_hash": "sha256:example"
    }
  ]
}
```

`id` 是稳定内部引用；`node_id` 是实现入口，不能用page代替具体Frame。`states` 和 `responsive` 必须区分用户要求、Figma证据和推断。

`figma_preferred` 无法访问时允许：

```json
{
  "fallback": {
    "reason": "Figma MCP unavailable; reuse existing design system"
  }
}
```

`figma_required` 不允许这种降级。
