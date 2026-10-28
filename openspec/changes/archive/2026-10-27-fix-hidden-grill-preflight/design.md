# Design

## Context

见 proposal.md。初始化器已经使用 `SKILL.md` 的磁盘位置验证安装结果；工作流 preflight 则只检查调用方传入的宿主 Skill 名称，两处对“可用”的定义不一致。

## Goals / Non-Goals

**Goals:**

- 让 preflight 正确识别已安装但被宿主隐藏的 `grill-with-docs`。
- 保留对三个实际可调用 Skill 的严格检查。

**Non-Goals:**

- 不修改或复制 `mattpocock/skills` 内容。
- 不放宽 `grilling`、`domain-modeling` 或审查 Skill 的可调用性要求。

## Decisions

在 preflight 中复用初始化器相同的两个全局 Skill 路径：`$CODEX_HOME/skills`（未设置时为 `~/.codex/skills`）和 `~/.agents/skills`。仅 `grill-with-docs` 可用磁盘安装证据补足宿主列表，因为它的上游元数据明确禁止模型调用；其他 Skill 仍只认宿主列表。

不选择删除 `grill-with-docs` 固定依赖，因为用户已明确要求保留它；也不选择把所有 Skill 都改为仅检查文件，因为文件存在不代表宿主能够调用。

## Risks / Trade-offs

- [宿主使用其他 Skill 根目录] → 继续支持现有初始化器已经验证的两个目录，避免引入未经安装器支持的路径猜测。
- [文件存在但内容损坏] → 初始化器和插件校验继续负责安装完整性；preflight 只修正可见性误判。
