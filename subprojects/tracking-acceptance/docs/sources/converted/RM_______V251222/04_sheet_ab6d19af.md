# 自定义事件

- 行数：291
- 列数：5

|自定义事件名称|字段名称|描述|是否必需|备注|
|---|---|---|---|---|
|20001 - 新手引导 Tutorial|event_id|自定义事件ID：20001，HYL:新手引导环节开始&完成，TutorialStep.id|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "新手引导"|||
||tutorial_id|引导编号|必填|int，= TutorialStep.id|
||tutorial_state|引导状态，>>点击查看：枚举列表<<|必填|int|
||||||
|20002 - 玩家成长 PlayerGrow|event_id|自定义事件ID：20002，HYL:玩家成长日志，包括：玩家/商店/种植物等成长|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "玩家成长"|||
||grow_type|成长类型，>>点击查看：枚举列表<<|必填|int|
||grow_target|成长目标ID||int，Store.id/Plant.id|
||grow_pre|成长前数值|必填|int|
||grow_post|成长后数值|必填|int|
||||||
|20003 - 成长解锁 GrowUnlock|event_id|自定义事件ID：20003，HYL:玩家成长解锁内容，包括：功能/场景/种植物/花艺配方等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "成长解锁"|||
||unlock_type|解锁类型，>>点击查看：枚举列表<<|必填|int|
||unlock_target|成长目标ID|必填|int，GameFunc.id/Plant.id/Formula.id/SocialRes.id|
||||||
|20004 - 游戏货币 GameCurrency|event_id|自定义事件ID：20004，HYL:游戏货币变更日志，参照【资源产销-Prop】|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "游戏货币"|||
||currency_id|游戏货币ID|必填|int|
||act_type|变更类型，>>点击查看：枚举列表<<|必填|int|
||act_amount|变更数额|必填|int|
||scene|变更场景，>>点击查看：功能场景<<||string|
||scene_extension|货币变更来源扩展参数，商品ID、随机礼盒ID等||int|
||||||
|20005 - 资源存量 Inventory|event_id|自定义事件ID：20005，HYL:角色下线后异步上报(与Logout同时)|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "资源存量"|||
||inventory|资源库存|必填|map，= {"$item_id":$item_cnt,"$item_id":$item_cnt,...}|
||item_id|物品ID|必填|key，string，广义物品：Item.id/Furniture.id/PlayerAvatar.id/Plant.id/Formula.id|
||item_cnt|物品数量|必填|value，int|
||||||
|20006 - 鲜花种植 Plant|event_id|自定义事件ID：20006，HYL:鲜花种植相关操作日志，培育/种植/浇水/收获等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "鲜花种植"|||
||plant_id|种植物ID|必填|int|
||operation_type|操作类型，>>点击查看：枚举列表<<|必填|int|
||operation_cnt|操作数量，批量操作时计数|必填|int，默认1|
||gain_item|收获物||map，= {"$item_id":$item_cnt,"$item_id":$item_cnt,...}|
||item_id|收获物ID||key，string|
||item_cnt|收获物数量||value，int|
||||||
|20007 - 花艺制作 FloralMake|event_id|自定义事件ID：20007，HYL:花艺制作相关操作日志，制作&收获等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "花艺制作"|||
||formula_type|配方类型，>>点击查看：枚举列表<<||int|
||formula_id|配方ID|必填|int|
||operation_type|操作类型，>>点击查看：枚举列表<<|必填|int|
||output_id|产物ID|必填|int，= Item.id|
||output_cnt|产物数量|必填|int|
||||||
|20008 - 花艺售卖 FloralSell|event_id|自定义事件ID：20008，HYL:花艺售卖相关操作日志，上架/结算/下架等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "花艺售卖"|||
||operation_type|操作类型，>>点击查看：枚举列表<<|必填|int|
||floral_id|花艺品ID|必填|int，= Item.id|
||floral_cnt|花艺品数量|必填|int|
||||||
|20009 - 经营订单 OperateOrder|event_id|自定义事件ID：20009，HYL:经营订单相关操作日志，触发/交付/超时等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "经营订单"|||
||order_type|订单类型，>>点击查看：枚举列表<<|必填|int|
||customer_id|顾客ID||int|
||operation_type|操作类型，>>点击查看：枚举列表<<|必填|int|
||order_item|订单物品|必填|map，= {"$item_id":$item_cnt,"$item_id":$item_cnt,...}|
||item_id|订单物品ID||key，string|
||item_cnt|订单物品数量||value，int|
||||||
|20010 - 场景事件 SceneEvent|event_id|自定义事件ID：20010，HYL:场景事件相关操作日志，触发/完成等|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "场景事件"|||
||event_type|事件类型，>>点击查看：枚举列表<<||int|
||game_event_id|事件ID|必填|int|
||customer_id|顾客ID||int|
||operation_type|操作类型，>>点击查看：枚举列表<<|必填|int|

> 注：Markdown 仅保留前 80 行预览；完整数据见同名 CSV。
