# 项目管理API接口文档

# 获取API权限

每个三方应用访问项目管理数据API，需提前获取到Access-Token，获取方式先联系数据部产品

# 接口格式

## 请求方法

**GET**

## 请求地址

https://apps-api.dobest.com/{version}/{resource}?access\_token={access\_token}

请求地址由三部分构成

*   version：接口版本号
    
*   resource：访问资源 
    
*   access-token：上一步拿到的token令牌
    

## 响应内容

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |
| --- | --- | --- | --- |
|  code  |  number  |  是  |  返回码  |
|  message  |  string  |   |  返回值  |
|  data  |  json  |  是  |  json返回值  |
|  list  |  array  |  是  |  数据列表  |
|  page\_info  |  json  |  是  |  分页信息  |
|  page  |  number  |  是  |  页数  |
|  page\_size  |  number  |  是  |  页面大小  |
|  total\_number  |  number  |  是  |  总数  |
|  total\_page  |  number  |  是  |  总页数  |
|  requestId  |  string  |  是  |  请求日志id  |

# 接口列表

## 获取项目列表

**请求地址**

https://apps-api.dobest.com/v1.0/apps?access\_token={access\_token}&page={page}&page\_size={page\_size}

**请求参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |
| --- | --- | --- | --- |
|  access\_token  |  string  |  是  |  授权Access-Token，管理员分配   |
|  page  |  number  |   |  页数默认值：1，page范围为\[1,99999\]   |
|  page\_size  |  number  |   |  页面大小默认值：10，page\_size范围为\[1,100\]  |
|  include\_origin\_mapping  |  boolean  |   |  包含历史系统映射关系，支持true、false，默认false  |
|  app\_id  |  string  |   |  项目ID,多个项目ID用英文逗号分割  |
|  app\_name  |  string  |   |  项目名称，模糊查找  |
|  app\_status  |  number  |   |  项目状态，多个状态以逗号分割，允许的状态枚举以及对应含义如下 0: 停运、1：在营、2：预研、3：在研、4：关停  |
|  app\_type  |  number  |   |  项目类型，多个类型以逗号分割，允许的类型枚举以及对应含义如下 1： 游戏、2：应用、3：工具、4：内部系统、5：其他  |
|  origin\_id  |  string  |  否  |  旧项目的映射ID，多个映射ID，用英文逗号分隔 可通过旧项目ID查出有映射该ID的所有新项目列表  |
|  status  |  string  |   |  默认值为空，不包含已删除 可选枚举 **all:** 所有（包含已删除） **deleted**: 已删除  |
|  **segment**  |  **string**  |   |  **业务板块信息（待上线），多个板块用英文逗号分隔** **可选枚举 yoka：游卡、offline：线下 、fengqu：锋趣、lingzhifeng：领之锋**  |

**返回参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |  **枚举示例**  |
| --- | --- | --- | --- | --- |
|  code  |  number  |  是  |  返回码  |   |
|  message  |  string  |   |  返回值  |   |
|  data  |  json  |  是  |  json返回值  |   |
|  list  |  array  |  是  |  数据列表  |   |
|  **app\_id**  |  number  |  是  |  项目ID  |   |
|  **app\_name**  |  string  |  是  |  项目名称  |   |
|  **app\_en\_name**  |  string  |  是  |  项目英文名  |   |
|  **app\_alias**  |  string  |  是  |  项目别名  |   |
|  **studio\_id**  |  number  |  是  |  工作室ID  |   |
|  **studio\_name**  |  string  |  是  |  工作室名称  |   |
|  **department\_id**  |  number  |  是  |  项目部ID  |   |
|  **department\_name**  |  string  |  是  |  项目部名称  |   |
|  **product\_id**  |  number  |  是  |  产品ID  |   |
|  **product\_name**  |  string  |  是  |  产品名称  |   |
|  **publisher\_id**  |  number  |  是  |  发行商ID  |   |
|  **publish\_name**  |  string  |  是  |  发行商名称  |   |
|  **publisher\_url**  |  string  |  是  |  发行商域名  |  例如www.yokaverse.com，可用于再营销业务。  |
|  **publisher\_iosteam\_id**  |  string  |  是  |  iOS TeamID  |  苹果开发者ID，可用于再营销业务  |
|  **develop\_department\_id**  |  number  |  是  |  开发项目部ID  |   |
|  **develop\_department\_name**  |  string  |  是  |  开发项目部名称  |   |
|  **app\_type**  |  string  |  是  |  项目类型  |  游戏，应用，工具，内部系统，其它  |
|  **app\_stype**  |  string  |  是  |  归属类型  |  自研、代理、独代、授权  |
|  **app\_region**  |  string  |  是  |  发行范围  |  中国大陆、海外  |
|  **app\_country**  |  string  |  是  |  国家地区  |  中国港台、东南亚、欧美、中东、日本、韩国 ...  |
|  **device\_type**  |  string  |  是  |  终端类型  |  手游、端游、页游、H5游戏、PSP、电视游戏、车载游戏、云游戏  |
|  **revenue\_type**  |  string  |  是  |  收入模式  |  内购、付费下载、广告表现、混合变现、其他  |
|  **icon**  |  string  |  否  |  项目图标  |   |
|  **app\_status**  |  string  |  是  |  项目状态  |  预研、在研、运营(正常)、运营(不更新)、停运、关停  |
|  **app\_releasetime**  |  string  |  是  |  上线时间  |  YYYY-MM-DD  |
|  **account\_id**  |  number  |  是  |  用户体系ID  |  返回0表示未分配用户体系  |
|  **acount\_identifier**  |  string  |  否  |  用户体系别名  |   |
|  **mappings**  |  array  |  否  |  映射关系  |   |
|  **origin\_system**  |  string  |  否  |  映射系统  |  枚举：支持mofang、anysdk、topsdk、qa、zl、youshu等  |
|  **origin\_id**  |  string  |  否  |  映射ID  |   |
|  **origin\_name**  |  string  |  否  |  映射名称  |   |
|  **is\_deleted**  |  int  |  是  |  是否删除  |  1:已删除，0:未删除  |
|  **gssdk\_status**  |  string  |  是  |  GSSDK接入状态  |  枚举值：已接入、未接入 **返回****空字符****表示该信息未录入**  |
|  **segment**  |  string  |  否  |  业务板块  |  枚举：yoka、offline 、fengqu、lingzhifeng **返回空字符表示信息未配置**  |
|  page\_info  |  json  |  是  |  分页信息  |   |
|  page  |  number  |  是  |  页数  |   |
|  page\_size  |  number  |  是  |  页面大小  |   |
|  total\_number  |  number  |  是  |  总数  |   |
|  total\_page  |  number  |  是  |  总页数  |   |
|  requestId  |  string  |  是  |  请求日志id  |   |

## 获取渠道列表

**请求地址**

https://apps-api.dobest.com/v1.0/channels?access\_token={access\_token}&page={page}&page\_size={page\_size}

**请求参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |
| --- | --- | --- | --- |
|  access\_token  |  string  |  是  |  授权Access-Token，管理员分配   |
|  page  |  number  |   |  页数默认值：1，page范围为\[1,99999\]   |
|  page\_size  |  number  |   |  页面大小默认值：10，page\_size范围为\[1,100\]  |
|  include\_origin\_mapping  |  boolean  |   |  包含历史系统映射关系，支持true、false，默认false  |
|  **status**  |  string  |   |  默认值为空，不包含已删除 可选枚举 **all:** 所有（包含已删除） **deleted**: 已删除  |
|  origin\_id  |  string  |   |  旧渠道的映射id，多个映射id，用英文逗号分隔 可通过旧渠道ID查出有映射该ID的所有新渠道列表  |

**返回参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |  **枚举示例**  |
| --- | --- | --- | --- | --- |
|  code  |  number  |  是  |  返回码  |   |
|  message  |  string  |   |  返回值  |   |
|  data  |  json  |  是  |  json返回值  |   |
|  list  |  array  |  是  |  数据列表  |   |
|  **channel\_id**  |  **number**  |  **是**  |  **渠道ID**  |   |
|  **channel\_name**  |  **string**  |  **是**  |  **渠道名称**  |   |
|  channel\_device  |  **string**  |  **是**  |  **渠道终端**  |  PC端、web端、安卓端、iOS端、H5端、其它、**鸿蒙**  |
|  channel\_type  |  **string**  |  **是**  |  **渠道分类**  |  官网渠道、联运渠道、其它渠道  |
|  **channel\_region**  |  **string**  |  **是**  |  **渠道区域**  |  国内、海外  |
|  channel\_identifier   |  string  |  否  |  渠道别名  |   |
|  channel\_url  |  string  |  否  |  渠道网址  |   |
|  account\_type  |  **string**  |  **是**  |  **用户体系**  |  游卡、小米、华为 ... ( 即不同的用户账号体系 ）  |
|  **acount\_identifier**  |  **string**  |  **是**  |  **用户体系别名**  |  yoka、xiaomi、huawei...（用户体系的字母标识）  |
|  **is\_deleted**  |  **int**  |  **是**  |  **是否删除**  |  **1:已删除，0:未删除**  |
|  **mappings**  |  array  |  否  |  映射关系  |   |
|  **origin\_system**  |  string  |  否  |  映射系统  |  枚举：支持mofang、anysdk、topsdk、qa等  |
|  **origin\_id**  |  string  |  否  |  映射ID  |   |
|  **origin\_name**  |  string  |  否  |  映射名称  |   |
|  page\_info  |  json  |  是  |  分页信息  |   |
|  page  |  number  |  是  |  页数  |   |
|  page\_size  |  number  |  是  |  页面大小  |   |
|  total\_number  |  number  |  是  |  总数  |   |
|  total\_page  |  number  |  是  |  总页数  |   |

## 获取用户体系列表

**请求地址**

https://apps-api.dobest.com/v1.0/accounts?access\_token={access\_token}&page={page}&page\_size={page\_size}

**请求参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |
| --- | --- | --- | --- |
|  access\_token  |  string  |  是  |  授权Access-Token，管理员分配   |
|  page  |  number  |   |  页数默认值：1，page范围为\[1,99999\]   |
|  page\_size  |  number  |   |  页面大小默认值：10，page\_size范围为\[1,100\]  |
|  status  |  string  |   |  all：筛选所有 deleted：筛选已删除 空：筛选正常（默认为空）  |

**返回参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |  **枚举示例**  |
| --- | --- | --- | --- | --- |
|  code  |  number  |  是  |  返回码  |   |
|  message  |  string  |   |  返回值  |   |
|  data  |  json  |  是  |  json返回值  |   |
|  list  |  array  |  是  |  数据列表  |   |
|  **account\_id**  |  **number**  |  **是**  |  **用户体系ID**  |   |
|  **account\_type**  |  **string**  |  **是**  |  **用户体系**  |  游卡、小米、华为 ... ( 即不同的用户账号体系 ）  |
|  **acount\_identifier**  |  **string**  |  **是**  |  **用户体系别名**  |  yoka、xiaomi、huawei...（用户体系的字母标识）  |
|  **account\_sort**  |  **string**  |  **是**  |  **用户体系类型**  |  官方用户体系、联运用户体系  |
|  **is\_deleted**  |  **number**  |  **是**  |  **是否已删除**  |  1：已删除 0：未删除  |
|  **channel\_list**  |  **array**  |  **是**  |  **渠道号列表**  |   |
|  **channel\_id**  |  **number**  |  **是**  |  **渠道ID**  |   |
|  **channel\_name**  |  **string**  |  **是**  |  **渠道名称**  |   |
|  **channel\_identifier**   |  **string**  |  否  |  **渠道别名**  |   |
|  page\_info  |  json  |  是  |  分页信息  |   |
|  page  |  number  |  是  |  页数  |   |
|  page\_size  |  number  |  是  |  页面大小  |   |
|  total\_number  |  number  |  是  |  总数  |   |
|  total\_page  |  number  |  是  |  总页数  |   |

## 获取发行商列表

**请求地址**

https://apps-api.dobest.com/v1.0/publishers?access\_token={access\_token}&page={page}&page\_size={page\_size}

**请求参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |
| --- | --- | --- | --- |
|  access\_token  |  string  |  是  |  授权Access-Token，管理员分配   |
|  page  |  number  |   |  页数默认值：1，page范围为\[1,99999\]   |
|  page\_size  |  number  |   |  页面大小默认值：10，page\_size范围为\[1,100\]  |
|  status  |  string  |   |  all：筛选所有 deleted：筛选已删除 空：筛选正常（默认为空）  |

**返回参数**

|  **字段**  |  **类型**  |  **是否必填**  |  **说明**  |  **枚举示例**  |
| --- | --- | --- | --- | --- |
|  code  |  number  |  是  |  返回码  |   |
|  message  |  string  |   |  返回值  |   |
|  data  |  json  |  是  |  json返回值  |   |
|  list  |  array  |  是  |  数据列表  |   |
|  **publisher\_id**  |  **number**  |  **是**  |  **发行商ID**  |   |
|  **publish\_sname**  |  **string**  |  **是**  |  **发行商简称**  |  游卡、锋趣、领沃、playbest...  |
|  **publish\_name**  |  **string**  |  **是**  |  **发行商全称**  |  杭州游卡网络技术有限公司、Playbest Limited...  |
|  **publisher\_url**  |  **string**  |  **是**  |  **发行商域名**  |  **例如www.yokaverse.com，可用于再营销业务。** **SDK和智投侧可额外设置：** **国内默认域名：sunrisecolors.cn** **海外默认域名：**[**zhaoxiadata.com**](http://zhaoxiadata.com)  |
|  **publisher\_iosteam\_id**  |  **string**  |  **是**  |  **iOS TeamID**  |  **苹果开发者ID，可用于再营销业务**  |
|  **publisher\_type**  |  **string**  |  **是**  |  **发行商类型**  |  官方发行商、非官方发行商  |
|  **publisher\_region**  |  **string**  |  **是**  |  **发行商区域**  |  国内、海外  |
|  **is\_deleted**  |  **number**  |  **是**  |  **是否已删除**  |  1：已删除 0：未删除  |
|  page\_info  |  json  |  是  |  分页信息  |   |
|  page  |  number  |  是  |  页数  |   |
|  page\_size  |  number  |  是  |  页面大小  |   |
|  total\_number  |  number  |  是  |  总数  |   |
|  total\_page  |  number  |  是  |  总页数  |   |

# 返回码

|  **状态码**  |  **描述**  |
| --- | --- |
|  0  |  成功  |
|  1000  |  Token不合法  |
|  2000  |  参数错误  |

# 接口更新日志

## 2024-07-10

|  **接口名**  |  **接口地址**  |  **更新说明**  |
| --- | --- | --- |
|  项目列表  |  `/apps`  |  返回新增account\_id、acount\_identifier传递官方用户体系信息  |
|  用户体系列表  |  `/accounts`  |  *   响应返回is\_deleted 1：已删除，0:正常      *   请求传参新增status：all：筛选所有 ,deleted：筛选已删除,空：筛选正常       |

## 2024-08-06

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  项目列表  |  `/apps`  |  *   请求参数新增**origin\_id,**可通过旧项目ID查出有映射该ID的所有新项目列表      *   响应返回项目别名（**app\_alias**）字段       |
|  渠道列表  |  `/channels`  |  *   请求参数新增 **origin\_id**，通过渠道映射ID过滤      *   响应字段新增返回渠道别名（**channel\_identifier**）、渠道网址（**channel\_url**）      *   接口文档中，原 **acount\_identifier** 的文档说明改为 **用户体系别名**       |
|  用户体系列表  |  `/account``s`  |  *   接口响应中，新增用户体系关联的渠道别名字段（**channel\_identifier**）      *   接口文档中，原 **acount\_identifier** 的文档说明改为 **用户体系别名**       |

## 2024-08-19

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  渠道列表  |  `/channels`  |  响应字段中channel\_device增加 "**鸿蒙**"枚举  |

## 2024-09-24

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  渠道列表  |  `/channels`  |  *   响应返回is\_deleted 1：已删除，0:正常      *   请求传参新增status：all：筛选所有 ,deleted：筛选已删除,空：筛选正常       |
|  项目列表  |  `/apps`  |  *   响应返回is\_deleted 1：已删除，0:正常      *   请求传参新增status：all：筛选所有 ,deleted：筛选已删除,空：筛选正常       |

## 2024-11-21

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  发行商列表  |  `/publishers`  |  *   新增获取发行商列表接口，可用于获取发行商信息       |
|  项目列表  |  `/apps`  |  *   返回新增 publisher\_url、publisher\_iosteam\_id 传递再营销业务相关的发行商信息       |

## 2025-05-07

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  项目列表  |  `/apps`  |  *   返回新增 **gssdk\_status ，**传递GSSDK接入状态信息       |

## 2025-07-07

|  接口名  |  接口地址  |  更新说明  |
| --- | --- | --- |
|  项目列表  |  `/apps`  |  *   接口请求新增 **segment**， 过滤项目信息      *   接口响应新增 **segment，**传递业务板块信息       |