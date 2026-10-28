# Design

## Context

见 `proposal.md`。现有 `check-finish` 能在活动Change目录上验证方案、任务、审查和交付证据，`state complete` 随后直接写completed。OpenSpec归档会移动Change并同步 `openspec/specs/`，属于必须先验证外部结果才能重试的写操作。

## Goals / Non-Goals

**Goals:**

- 复用OpenSpec原生命令完成归档和规格同步。
- 让completed严格表示FINISH与ARCHIVE均已通过。
- 在归档命令和状态写入之间中断时避免重复归档。
- 保留现有原子状态写入和 `.auto-dev` 运行历史。

**Non-Goals:**

- 不复制OpenSpec的归档、规格合并或验证逻辑。
- 不新增批量归档器、回滚器或后台任务。
- 不自动删除运行记录或归档目录。

## Decisions

### FINISH门禁与ARCHIVE分离

Skill先对活动Change运行 `check-finish`，通过后记录 `state begin archive`，再直接执行 `openspec archive <change-id> --yes --json`。命令成功后核对活动目录消失、归档目录存在及OpenSpec验证通过，然后使用通用 `state pass archive` 保存归档路径证据。

相比把OpenSpec调用封装进Node脚本，这一方案保持外部写操作显式可见，并复用已有状态步骤操作；Node脚本只负责完成门禁，不实现归档。

### completed要求归档步骤通过

`state complete` 在现有FINISH检查之外要求 `archive` 状态为passed且包含证据。完成命令接收归档后的Change路径，因此仍可复用方案哈希、任务和证据检查。方案变化时同时使finish和archive结果失效。

### 恢复时核对外部结果

若恢复时archive为running或interrupted，Skill先检查活动Change和 `openspec/changes/archive/*-<change-id>`：只有活动Change仍存在且没有匹配归档结果时才重试命令；若已归档则验证结果后补记pass。若两边同时存在或都不存在，则blocked并请求人工判断。

### 迁移现有完成Change

实现与测试通过后，使用OpenSpec原生命令归档仓库中已有的完成Change并验证正式规格；当前 `archive-completed-change` 在自身FINISH后使用新流程归档，从而完成端到端验证。

## Risks / Trade-offs

- [OpenSpec归档后的路径包含日期] → 从命令JSON结果或唯一匹配目录取得路径，不自行预测日期。
- [直接使用旧版状态CLI的调用方缺少archive步骤] → 版本升级至0.4.0并在README明确迁移命令。
- [归档后再次发现代码问题] → ARCHIVE只在双审和FINISH门禁通过后执行；Git仍保留可恢复历史。
- [归档命令部分成功] → 恢复时以文件系统和OpenSpec验证结果为准，不根据running状态盲目重放。

## Migration Plan

1. 更新Skill、状态门禁、测试与文档并升级版本。
2. 完成双重代码审查和FINISH门禁。
3. 直接调用OpenSpec归档既有完成Change并验证正式规格。
4. 使用新ARCHIVE流程归档当前Change，再把运行标记为completed。
5. 回滚代码时保留已归档Change和正式规格，不执行破坏性反向移动。
