# Design

## Context

见 `proposal.md`。当前仓库已经具备无运行时依赖的 Node.js 脚本、Marketplace 清单和固定外部 Skill 声明，但用户仍需分别执行多条安装命令，并直接使用 OpenSpec CLI。

## Goals / Non-Goals

**Goals:**

- 用一个跨平台 Node.js CLI 串联依赖检查、按需安装、插件安装和项目初始化。
- 保持重复执行安全，并让失败步骤可见。
- 保留 OpenSpec 作为内部规范引擎，而不向用户暴露初始化细节。

**Non-Goals:**

- 不自动安装 Node.js、npm、npx、Git 或 Codex 本体。
- 不发布 npm registry 包；首版通过 Git 仓库地址运行 CLI。
- 不在 `init` 时创建具体 Change、生成业务方案或修改业务代码。

## Decisions

### 单文件 Node.js CLI

在 `bin/speclane.mjs` 中实现 CLI 并导出可测试函数，`package.json` 同时声明 `SpecLane` 与 `speclane` 两个 bin。相比引入命令行框架，这能复用项目现有 Node.js 标准库约束，减少安装面和平台差异。

### 缺失时才执行安装

CLI 先通过命令探测、全局 Skill 列表和 Codex 插件 JSON 输出判断状态，再执行安装。外部 Skill 使用 `skills` CLI 的全局、Codex、非交互复制模式；SpecLane 插件使用现有 Gitee Marketplace。相比每次强制重装，这能避免覆盖用户配置并缩短重复初始化。

### OpenSpec 仍作为内部实现

`SpecLane init` 最终调用 `openspec init <目录> --tools codex --language zh-CN --no-animation`。这保留 OpenSpec 的官方初始化语义和兼容性，同时将用户入口统一到 SpecLane。

### Git 地址提供首版一键入口

README 提供一条带 `--allow-git=all` 的 `npm exec --package=git+https://gitee.com/fool1582/SpecLane.git` 命令，仅为本次执行显式允许 npm 获取 Git 包，再从仓库临时取得 CLI 并执行初始化。未来发布 npm 包时可缩短为 `npx speclane init`，但首版不依赖注册表名称占用或发布凭据。

## Risks / Trade-offs

- [全局安装在部分 Unix 环境需要权限] → 原样保留失败输出并停止，不自动使用 `sudo`。
- [上游 latest 版本行为可能变化] → 安装后立即验证命令或 Skill 列表；失败时不继续初始化。
- [网络中断造成部分依赖已安装] → 每一步先探测状态，用户可安全重试同一命令。
- [CLI 无法安装 Codex 本体] → 将 Codex 作为明确前置条件，在任何全局修改前检查。

## Migration Plan

1. 增加 CLI、bin 清单和测试。
2. 将 README 的首次安装入口改为单命令，并保留手动排障命令。
3. 发布仓库更新；现有插件用户不受影响，可直接开始使用新命令。
4. 回滚时移除 bin 入口并恢复原安装说明，不影响已初始化项目。
