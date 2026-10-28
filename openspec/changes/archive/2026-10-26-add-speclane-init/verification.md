# Verification

## 已执行

- `node --check bin/speclane.mjs`：通过。
- `npm test`：19项通过，0项失败。
- `npm run validate:plugin`：通过，识别 `speclane@0.2.0`、两个Skill和两个CLI别名。
- `node bin/speclane.mjs --help` 与 `--version`：通过。
- `node bin/speclane.mjs init .test-tmp/live-init-020`：真实创建 OpenSpec 项目；重复执行跳过安装和已有配置。
- `npm pack` 后通过 `npm exec --package=<tarball> -- speclane --version`：输出 `0.2.0`。
- 推送后通过 Gitee Git 包执行 `npm exec --yes --allow-git=all --package=git+https://gitee.com/fool1582/SpecLane.git -- SpecLane init <临时目录>`：成功创建 OpenSpec 结构并配置 Codex。
- 通过 Gitee Git 包全局安装后执行 `SpecLane --version`：输出 `0.2.0`，覆盖 npm 目录联接场景。
- `openspec validate add-speclane-init --type change --strict --no-interactive`：通过。
- `git diff --check`：通过。

## 未执行

- 未在完全没有 OpenSpec、外部 Skill 和 Marketplace 的干净实体机器上执行联网安装；缺失路径由隔离单元测试覆盖，本机远程真实链路验证使用已有依赖。
- 未发布到 npm registry；一键入口使用 Gitee Git 包。
