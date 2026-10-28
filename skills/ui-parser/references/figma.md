# Figma使用规则

运行前动态检查当前暴露的Figma MCP工具和权限，不把文档中的工具名当作必然存在的接口。

- `metadata`: 只定位文件、页面和目标Frame/组件；不遍历整份大文件。
- `implementation`: 以目标 `node_id` 为入口，按需获取设计上下文、截图、变量、组件和素材。
- `verification`: 获取可复核的设计参照，记录来源、时间和内容指纹。

优先使用有效的Code Connect映射，但必须验证源码、导入路径和Props。临时资源URL不能直接成为生产资源。默认只读Figma；没有授权不得修改设计源。

无MCP、无权限或工具错误时记录 `unavailable` 或 `blocked`，不得生成伪造响应或成功截图。
