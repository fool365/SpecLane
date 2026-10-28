# Proposal

## Why

当前用户安装 SpecLane 后仍需分别安装 OpenSpec、三个外部澄清 Skill，并直接执行 `openspec init`。这与“一键安装、统一入口”的产品目标不一致，也容易因漏装依赖导致首次运行阻塞。

## What Changes

- 提供 `SpecLane init [目录]` 命令，并兼容常规小写入口 `speclane init [目录]`。
- `init` 自动检查运行环境，按需安装 OpenSpec 和三个固定外部 Skill，再调用底层 OpenSpec 初始化目标项目。
- 初始化过程输出明确步骤和失败原因；已有依赖或已初始化项目不得被盲目覆盖。
- README 的首次安装和项目初始化说明统一改为 SpecLane CLI，不再要求用户直接执行 `openspec init`。

## Capabilities

### New Capabilities

- `project-bootstrap`: 统一管理 SpecLane CLI 的依赖安装、项目初始化、幂等检查和错误报告。

### Modified Capabilities

无。

## Impact

- 新增 Node.js CLI 入口与对应测试。
- 修改 `package.json`、README 和插件校验规则。
- 运行时会调用 npm、npx 和 OpenSpec；网络安装只发生在用户主动执行 `init` 且依赖缺失时。
