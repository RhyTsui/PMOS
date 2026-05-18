# Dataki 知识库 v1.1

*   版本：v1.1
    
*   日期：2026-04-24
    
*   状态：Draft
    
*   适用范围：WeKnora 二开的第一个版本定义
    
*   读者对象：产品、设计、前端、后端、测试、AI
    

---

# 一、需求清单

|  分类  |  模块  |  需求  |  描述  |  备注  |  设计图  |
| --- | --- | --- | --- | --- | --- |
|  登录  |  系统名称  |  替换开源标识  |  Dataki  链接知识和数据  |   |  ![image](https://docs-body.xiaoshanim.com/res/aPnWgYwgnqeYZ6l4/img/13557651-46b8-48ac-9124-dcbb26dcdff2.png?Expires=1777022352&OSSAccessKeyId=file-s3-gateway-ak&Signature=neaSa4sImFjd0GNXPdD%2BUwCZQBk%3D)  |
|  |  登录  |  采用统一小闪身份  |  [《接口请求域名地址说明》](https://docs.xiaoshanim.com/i/nodes/7gNKMlbrq3WXAAb6koni4Xv5p6Ad9nL1?utm_scene=team_space)  |  应用类型 ：0 App\_id  ：8217 > app\_secret  ：uRFc0oJUL9HEuBjzSpjAqzMFGdb8amCJSejmycQTR6pfoYKv1C6ERAM3HlGCoY9G > app\_key  ： > fQKNAJv1cBDHIPW9kBBYWR4gzMOdhcjt  |
|  |  登录  |  token约束  |      1. 有效期 7200 秒     2. 有效期内返回相同结果并自动续期     3. 服务端必须缓存 access\_token     4. 不能频繁调用 gettoken 接口  |   |
|  |  登录  |  统一前端登录组件  |  [登录组件](http://10.236.15.36:6006/?path=/docs/%E4%B8%9A%E5%8A%A1%E7%BB%84%E4%BB%B6-ykloginmodule-%E7%99%BB%E5%BD%95%E7%BB%84%E4%BB%B6--docs)交互与之一致，支持移动端  |  gent中引用下载的那个文件，组件库和skills已安装  |
|  |  用户隔离  |  默认同一个租户  |  小闪用户默认同一个租户【10001】  |  决策依据： 小闪文档目前也是一个租户。 后续如有特殊强隔离需求，可单独分配其他租户ID，当前可固定租户ID。  |
|  系统管理  |  全部设置  |  指定系统管理员  |  指定N个用户为超管，仅超管拥有高级设置权限，维护同一份全局设置、知识库设置、智能体管理，用户仅共用这套配置  |  系统管理员同时也是用户，拥有用户一样的知识库、共享空间、对话权限，均需要邀请进入。 \- 维护模型配置 \- 维护MCP配置 \- 维护 API Key / 网关 \- 维护全局默认参数 \- 处理用户异常和审计 \- 给各个空间使用方写智能体  |   |
|  |  知识库  |  用户设置权限收回  |  用户只支持基本信息，共享管理  |  禁止修改设置  |   |
|  |  智能体  |  用户设置权限收回  |  用户无该菜单，只支持对话框选择  |  禁止创建、编辑、复制、停用、共享到空间和删除智能体  |   |
|  |  共享空间  |  仅声明  |  超管不支持查看全部共享空间，知识库  |  只能邀请进入  |   |
|  |  对话  |  用户设置权限收回  |  用户只支持查看/选择智能体和大模型  |  禁止展示管理智能体、管理大模型的按钮。  |   |
|  |  个人中心  |  删除开源标识  |  删除API文档、官方网站、Github菜单  |   |   |

# 二、后续Wekrona升级影响评估

列举Wikrona披露规划中有价值的3点：

*   支持文档结构化 
    
*   支持音视频格式
    
*   支持数据表存储与索引
    

> https://github.com/Tencent/WeKnora/blob/main/docs/ROADMAP.md