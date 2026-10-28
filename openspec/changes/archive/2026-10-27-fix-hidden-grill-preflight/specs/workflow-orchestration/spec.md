# Spec Delta

## MODIFIED Requirements

### Requirement: 固定依赖检查
系统 MUST 在相关阶段使用前检查 Node.js、OpenSpec 和固定外部 Skill 依赖，缺失时返回可恢复的阻塞结果，不得伪造成功或擅自安装全局依赖。对于明确禁止模型调用的组合 Skill，系统 MUST 接受可调用列表或受支持的全局安装位置作为存在证据；其可调用子 Skill 仍 MUST 由宿主列表确认。

#### Scenario: OpenSpec 不存在
- **WHEN** 系统无法执行 `openspec --version`
- **THEN** 系统返回 `OPENSPEC_NOT_FOUND` 阻塞状态和安装指引

#### Scenario: 复杂澄清 Skill 缺失
- **WHEN** 复杂需求需要澄清但 `grill-with-docs` 未安装，或 `grilling`、`domain-modeling` 任一不可调用
- **THEN** 系统阻塞 CLARIFY 且不静默使用另一套澄清流程

#### Scenario: 组合 Skill 已安装但不在可调用列表
- **WHEN** `grill-with-docs` 已存在于受支持的全局 Skill 目录，但因禁止模型调用而未出现在宿主可调用列表中
- **THEN** 预检接受其安装证据，并继续验证 `grilling` 与 `domain-modeling` 的可调用性
