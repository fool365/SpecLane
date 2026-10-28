# Delivery

SpecLane 0.4.0把OpenSpec归档加入每轮功能的固定收尾流程。FINISH门禁通过后，Skill直接调用OpenSpec原生命令归档当前Change并同步正式规格；只有archive步骤通过且证据非空时，状态CLI才允许写completed。

归档中断时先核对活动Change和归档结果，成功后中断只补记状态，命令前中断才允许重试；`.auto-dev`运行记录始终保留。

验证结果：27/27测试通过，插件校验通过，双重代码审查通过；4个已完成Change已由OpenSpec原生命令归档，6个正式规格严格校验全部通过，活动Change列表为空。
