# Delivery

## 需求摘要

提供一键准备依赖和初始化项目的 SpecLane CLI，以 `SpecLane init [目录]` 取代用户直接执行 `openspec init`。

## 主要变更

- 新增 `SpecLane` 与 `speclane` 两个 CLI 入口，版本升级至 `0.2.0`。
- `init` 按需安装 OpenSpec、三个固定澄清 Skill 和 SpecLane Marketplace 插件。
- 初始化已有项目时跳过已有配置，失败时停止并返回非零状态。
- Windows 使用 PowerShell shim 安全执行命令，不启用 shell。
- README 提供 Gitee Git 包的一条命令入口和常驻 CLI 安装方式。

## 验证

- 19项自动化测试全部通过。
- 插件清单、npm tar包入口、真实初始化、重复初始化和 OpenSpec 严格校验通过。

## 使用

```powershell
npm exec --yes --allow-git=all --package=git+https://gitee.com/fool1582/SpecLane.git -- SpecLane init .
```

## 未完成项与风险

- 未发布 npm registry 包，当前一键入口从 Gitee Git 仓库获取。
- 未在完全干净的实体机器执行联网安装；该分支由隔离测试覆盖。

## OpenSpec状态

Change `add-speclane-init` 已完成实现和门禁验证，尚未归档。
