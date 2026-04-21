# 字段&枚举字典

- 行数：351
- 列数：5

|字典分类|参数字段 key|枚举值 key.value|字典文本|备用枚举|
|---|---|---|---|---|
|基础事件  枚举类字段 枚举字典|item_consumetype||物品产销类型||
|||item_consumetype.1|产出||
|||item_consumetype.2|消耗||
||scene||功能场景||
|||scene.gm|gm|enum=1|
|||scene.login|登录||
|||scene.creatRole|创角|enum=2|
|||scene.rename|改名||
|||scene.roleLevelUp|升级||
|||scene.bag|背包系统|enum=3，【208：资源产销-Prop】scene_extension = Item.id（背包道具or出售）|
|||scene.store|商店系统|enum=4，【208：资源产销-Prop】scene_extension = Goods.id|
|||scene.pay|充值|enum=5，【208：资源产销-Prop】scene_extension = Pay.id|
|||scene.vip|月卡特权|enum=6，【208：资源产销-Prop】scene_extension = Vip.id|
|||scene.ad|广告|【208：资源产销-Prop】scene_extension = Goods.id|
|||scene.mail|邮件系统|enum=7，【208：资源产销-Prop】scene_extension = Mail.id/GM|
|||scene.bulletin|通知消息|【208：资源产销-Prop】scene_extension = Bulletin.id/GM|
|||scene.storyMain|主线剧情|enum=8，【208：资源产销-Prop】scene_extension = Story.id|
|||scene.task|任务成就|enum=9，【208：资源产销-Prop】scene_extension = Task.id|
|||scene.tutorial|引导|【208：资源产销-Prop】scene_extension = Tutorial.id|
|||scene.plant|种植|enum=10，【208：资源产销-Prop】scene_extension = Plant.id|
|||scene.floralMake|花艺制作|enum=11，【208：资源产销-Prop】scene_extension = Formula.id|
|||scene.floralSell|花艺出售|enum=12，【208：资源产销-Prop】scene_extension = Item.id（花艺物品）|
|||scene.sceneOrder|顾客订单|enum=13，【208：资源产销-Prop】scene_extension = Item.id（订单物品）|
|||scene.mapOrder|居民订单|enum=14，【208：资源产销-Prop】scene_extension = Item.id（订单物品）|
|||scene.shipOrder|特供订单|enum=15，【208：资源产销-Prop】scene_extension = Item.id（订单物品）|
|||scene.grouponOrder|组团订单|enum=16，【208：资源产销-Prop】scene_extension = Item.id（订单物品）|
|||scene.sceneEvent|场景事件|enum=17，【208：资源产销-Prop】scene_extension = GameEvent.id|
|||scene.social|社交系统|社交好友基础功能|
|||scene.friendHire|好友雇佣|enum=18，【208：资源产销-Prop】scene_extension = 目标玩家uid|
|||scene.friendPluck|好友采摘|enum=19，【208：资源产销-Prop】scene_extension = 目标玩家uid|
|||scene.trade|交易系统|【208：资源产销-Prop】scene_extension = Item.id（交易物品）|
|||scene.guildBuild|公会建设|enum=20|
|||scene.guildPlant|公会种植|enum=21|
|||scene.guildShare|公会分享|enum=22，【208：资源产销-Prop】scene_extension = Item.id（分享鲜花）|
|||scene.sevenDayGift|福利-七日登录|enum=23，【208：资源产销-Prop】scene_extension = OpActGoal.id|
|||scene.dailySignin|福利-每日签到|enum=24，【208：资源产销-Prop】scene_extension = OpActGoal.id|
|||scene.growthRoad|福利-成长之路|enum=25，【208：资源产销-Prop】scene_extension = OpActGoal.id|
|||scene.welfareChest|福利-福利宝箱|enum=26|
|||scene.gacha|扭蛋|enum=28，【208：资源产销-Prop】scene_extension = Gacha.id|
|||scene.opAct|运营活动|【208：资源产销-Prop】scene_extension = OpActGoal.id|
|||scene.miniGame|内嵌游戏|【208：资源产销-Prop】scene_extension = game_mode|
|||scene.share|被动分享||
|||scene.interactive|关系链互动||
|||scene.gift|游戏圈礼包（平台推送礼包）|【208：资源产销-Prop】scene_extension = GiftId|
|||scene.cdk|CDK礼包|【208：资源产销-Prop】scene_extension = CDK|
|||scene.sub$subScene|推送订阅（拼接Push.sub_scene）||
|||scene.feedSub|推荐流订阅|【208：资源产销-Prop】scene_extension = Push.sub_scene|
|||scene.followAweme|关注官抖/官微||
|||scene.avatar|玩家换装||
|||scene.layout|场景布置||
|||scene.expand|场景扩建||
|||scene.roleHead|头像||
|||scene.gameFuncPreview|功能指南|【208：资源产销-Prop】scene_extension = GameFuncPreview.id|
||itemType||物品类型||
|||item_type.once|一次性物品||
|||item_type.lasting|永久性物品||
|||item_type.weekly|周时长物品||
|||item_type.monthly|月时长物品||
|||item_type.yearly|年时长物品||
|||item_type.free|免费物品||
||itemId||物品ID||
|||itemId.$id|*详见内容ID字典||
||||||
|自定义事件  参数名称 & 枚举名称|event_name||事件名称||
||tutorial_id||引导编号||
|||tutorial_id.$id|*详见内容ID字典|= Tutorial.id|
||tutorial_state||引导状态||
|||tutorial_state.1|触发|"trigger"|
|||tutorial_state.2|结束|"end"|
|||tutorial_state.3|跳过|"skip"|
||grow_type||成长类型||
|||grow_type.0|玩家等级|"player"|
|||grow_type.1|商店等级|"store"|
|||grow_type.2|种植物等级|"plantGrade"|
|||grow_type.3|种植物阶级|"plantRank"|
|||grow_type.4||*预留|
|||grow_type.5||*预留|
||grow_target||成长目标||
|||grow_target.$id|*详见内容ID字典|= Store.id/Plant.id|

> 注：Markdown 仅保留前 80 行预览；完整数据见同名 CSV。
