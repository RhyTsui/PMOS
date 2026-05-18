# -*- coding: utf-8 -*-
"""
Ad-Expert MCP V2 服务
基于FastMCP框架，为每个归因表提供独立查询工具（严格按 {db_type}_{table_name}_query 命名）
集成H5+APP、PC端、iOS融合归因三套专项排查逻辑

数据源: D:\ad_mcp_v2\data\归因表.xlsx
表结构:
  - ES: attr_click, attr_device, attr_user, attr_res_activation, attr_res_register, attr_res_pay, attr_res_retention, attr_res_asa, attr_res_validuser
  - SR: ods_uba_base_event_rt, ods_biz_attribution_campaign_rt, ods_uba_attr_clue_event_rt, ods_uba_attr_event_rt
  - MySQL: retry
"""

from mcp.server.fastmcp import FastMCP
import pandas as pd
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

mcp = FastMCP("Ad-Expert-V2")

# 数据目录
DATA_DIR = r"D:\ad_mcp_v2\data"
CONTEXT_LOG_DIR = os.path.join(DATA_DIR, "context_logs")

# 表定义（从归因表.xlsx解析）
TABLE_DEFINITIONS = [
    {"db_type": "es", "table_name": "attr_click", "table_name_cn": "媒体点击表", "csv_file": "attr_click.csv", "api_route": "/api/v1/es/attr_click"},
    {"db_type": "es", "table_name": "attr_device", "table_name_cn": "全量设备表", "csv_file": "attr_device.csv", "api_route": "/api/v1/es/attr_device"},
    {"db_type": "es", "table_name": "attr_user", "table_name_cn": "全量用户表", "csv_file": "attr_user.csv", "api_route": "/api/v1/es/attr_user"},
    {"db_type": "es", "table_name": "attr_res_activation", "table_name_cn": "激活归因结果表", "csv_file": "attr_res_activation.csv", "api_route": "/api/v1/es/attr_res_activation"},
    {"db_type": "es", "table_name": "attr_res_register", "table_name_cn": "注册归因结果表", "csv_file": "attr_res_register.csv", "api_route": "/api/v1/es/attr_res_register"},
    {"db_type": "es", "table_name": "attr_res_pay", "table_name_cn": "付费归因结果表", "csv_file": "attr_res_pay.csv", "api_route": "/api/v1/es/attr_res_pay"},
    {"db_type": "sr", "table_name": "ods_uba_base_event_rt", "table_name_cn": "基础原始事件表", "csv_file": "ods_uba_base_event_rt.csv", "api_route": "/api/v1/sr/ods_uba_base_event_rt"},
    {"db_type": "sr", "table_name": "ods_biz_campaign", "table_name_cn": "监测活动表", "csv_file": "ods_biz_campaign.csv", "api_route": "/api/v1/sr/ods_biz_campaign"},
    {"db_type": "sr", "table_name": "ods_uba_attr_event_rt", "table_name_cn": "点击归因表", "csv_file": "ods_uba_attr_event_rt.csv", "api_route": "/api/v1/sr/ods_uba_attr_event_rt"},
    {"db_type": "mysql", "table_name": "retry", "table_name_cn": "回推失败重试表", "csv_file": "retry.csv", "api_route": "/api/v1/mysql/retry"},
]

# ==================== 数据加载工具 ====================

def load_csv(filename: str) -> pd.DataFrame:
    """安全加载CSV文件"""
    try:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath, encoding='utf-8-sig')
        return pd.DataFrame()
    except Exception as e:
        print(f"加载 {filename} 失败: {e}")
        return pd.DataFrame()


def df_to_records(df: pd.DataFrame, limit: int = 100) -> List[Dict]:
    """将DataFrame转换为记录列表"""
    if df.empty:
        return []
    # 处理NaN值
    df = df.fillna("")
    return df.head(limit).to_dict(orient='records')


def filter_df(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """根据过滤条件筛选DataFrame"""
    result = df.copy()
    for col, val in filters.items():
        if col in result.columns and val:
            result = result[result[col].astype(str) == str(val)]
    return result


def get_table_info(db_type: str, table_name: str) -> dict:
    """获取表的元信息"""
    for t in TABLE_DEFINITIONS:
        if t["db_type"] == db_type and t["table_name"] == table_name:
            return t
    return None


# ==================== ES表 Tools (严格命名: es_{table_name}_query) ====================

@mcp.tool()
def es_attr_click_query(
    idfa: str = None,
    oaid: str = None,
    android_id: str = None,
    app_id: str = None,
    case_id: str = None,
    click_uuid: str = None,
    limit: int = 50
) -> dict:
    """
    ES媒体点击表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_click_yyyymmdd (媒体点击表)
    API路由: /api/v1/es/attr_click
    Mock数据: data/attr_click.csv

    关键字段: click_uuid, app_id, media_id, idfa, oaid, android_id, data_time
    注意: 点击表无device_id字段，需通过idfa/oaid/android_id等设备标识查询

    Args:
        idfa: IDFA标识符-iOS设备 (可选)
        oaid: OAID标识符-Android设备 (可选)
        android_id: Android设备ID (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        click_uuid: 点击UUID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的点击记录列表
    """
    df = load_csv("attr_click.csv")
    if df.empty:
        return {"success": False, "message": "点击表数据为空", "data": [], "api_route": "/api/v1/es/attr_click"}

    result = df.copy()
    if idfa:
        result = result[result['idfa'] == idfa]
    if oaid:
        result = result[result['oaid'] == oaid]
    if android_id:
        result = result[result['android_id'] == android_id]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]
    if click_uuid:
        result = result[result['click_uuid'] == click_uuid]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_click",
        "table_name_cn": "媒体点击表",
        "api_route": "/api/v1/es/attr_click",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def es_attr_device_query(
    device_id: str = None,
    idfa: str = None,
    app_id: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    ES全量设备表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_device_{app_id} (全量设备表)
    API路由: /api/v1/es/attr_device
    Mock数据: data/attr_device.csv

    关键字段: app_id, device_id, idfa, os_type, active_time, channel

    Args:
        device_id: 设备ID (可选)
        idfa: IDFA标识符 (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的设备记录列表
    """
    df = load_csv("attr_device.csv")
    if df.empty:
        return {"success": False, "message": "设备表数据为空", "data": [], "api_route": "/api/v1/es/attr_device"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if idfa:
        result = result[result['idfa'] == idfa]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_device",
        "table_name_cn": "全量设备表",
        "api_route": "/api/v1/es/attr_device",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def es_attr_user_query(
    user_id: str = None,
    device_id: str = None,
    app_id: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    ES全量用户表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_user_{app_id} (全量用户表)
    API路由: /api/v1/es/attr_user
    Mock数据: data/attr_user.csv

    关键字段: app_id, user_id, device_id, register_time, os_type

    Args:
        user_id: 用户ID (可选)
        device_id: 设备ID (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的用户记录列表
    """
    df = load_csv("attr_user.csv")
    if df.empty:
        return {"success": False, "message": "用户表数据为空", "data": [], "api_route": "/api/v1/es/attr_user"}

    result = df.copy()
    if user_id:
        result = result[result['user_id'] == user_id]
    if device_id:
        result = result[result['device_id'] == device_id]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_user",
        "table_name_cn": "全量用户表",
        "api_route": "/api/v1/es/attr_user",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def es_attr_res_activation_query(
    device_id: str = None,
    idfa: str = None,
    app_id: str = None,
    attr_source: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    ES激活归因结果表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_res_activation_{app_id} (激活归因结果表)
    API路由: /api/v1/es/attr_res_activation
    Mock数据: data/attr_res_activation.csv

    关键字段: device_id, idfa, app_id, attr_source, attr_campaign_id, data_time

    Args:
        device_id: 设备ID (可选)
        idfa: IDFA标识符 (可选)
        app_id: 应用ID (可选)
        attr_source: 归因来源 ad/natural (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的激活归因结果列表
    """
    df = load_csv("attr_res_activation.csv")
    if df.empty:
        return {"success": False, "message": "激活归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_activation"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if idfa:
        result = result[result['idfa'] == idfa]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if attr_source:
        result = result[result['attr_source'] == attr_source]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_activation",
        "table_name_cn": "激活归因结果表",
        "api_route": "/api/v1/es/attr_res_activation",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def es_attr_res_register_query(
    device_id: str = None,
    user_id: str = None,
    app_id: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    ES注册归因结果表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_res_register_{app_id} (注册归因结果表)
    API路由: /api/v1/es/attr_res_register
    Mock数据: data/attr_res_register.csv

    关键字段: device_id, user_id, app_id, register_time, attr_source

    Args:
        device_id: 设备ID (可选)
        user_id: 用户ID (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的注册归因结果列表
    """
    df = load_csv("attr_res_register.csv")
    if df.empty:
        return {"success": False, "message": "注册归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_register"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if user_id:
        result = result[result['user_id'] == user_id]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_register",
        "table_name_cn": "注册归因结果表",
        "api_route": "/api/v1/es/attr_res_register",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def es_attr_res_pay_query(
    device_id: str = None,
    user_id: str = None,
    order_id: str = None,
    app_id: str = None,
    min_amount: float = None,
    max_amount: float = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    ES付费归因结果表查询工具

    数据库类型: ES (Elasticsearch)
    目标表: attr_res_pay_{app_id} (付费归因结果表)
    API路由: /api/v1/es/attr_res_pay
    Mock数据: data/attr_res_pay.csv

    关键字段: device_id, user_id, order_id, amount, pay_time, attr_source

    Args:
        device_id: 设备ID (可选)
        user_id: 用户ID (可选)
        order_id: 订单ID (可选)
        app_id: 应用ID (可选)
        min_amount: 最小金额 (可选)
        max_amount: 最大金额 (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的付费归因结果列表
    """
    df = load_csv("attr_res_pay.csv")
    if df.empty:
        return {"success": False, "message": "付费归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_pay"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if user_id:
        result = result[result['user_id'] == user_id]
    if order_id:
        result = result[result['order_id'] == order_id]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if min_amount is not None:
        result = result[result['amount'] >= min_amount]
    if max_amount is not None:
        result = result[result['amount'] <= max_amount]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_pay",
        "table_name_cn": "付费归因结果表",
        "api_route": "/api/v1/es/attr_res_pay",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


# ==================== SR表 Tools (严格命名: sr_{table_name}_query) ====================

@mcp.tool()
def sr_ods_uba_base_event_rt_query(
    device_id: str = None,
    event_type: str = None,
    app_id: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    SR基础原始事件表查询工具

    数据库类型: SR (StarRocks)
    目标表: ods_uba_base_event_rt (基础原始事件表)
    API路由: /api/v1/sr/ods_uba_base_event_rt
    Mock数据: data/ods_uba_base_event_rt.csv

    关键字段: device_id, event_type, app_id, data_time, user_id

    Args:
        device_id: 设备ID (可选)
        event_type: 事件类型 activation/register/pay (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的基础事件列表
    """
    df = load_csv("ods_uba_base_event_rt.csv")
    if df.empty:
        return {"success": False, "message": "基础事件表数据为空", "data": [], "api_route": "/api/v1/sr/ods_uba_base_event_rt"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if event_type:
        result = result[result['event_type'] == event_type]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_uba_base_event_rt",
        "table_name_cn": "基础原始事件表",
        "api_route": "/api/v1/sr/ods_uba_base_event_rt",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def sr_ods_biz_campaign_query(
    app_id: str = None,
    media_id: str = None,
    campaign_name: str = None,
    limit: int = 50
) -> dict:
    """
    SR监测活动表查询工具

    数据库类型: SR (StarRocks)
    目标表: ods_biz_sunrise_attribution_campaign_rt (监测活动表)
    API路由: /api/v1/sr/ods_biz_campaign
    Mock数据: data/ods_biz_campaign.csv

    关键字段: app_id, media_id, campaign_name, status

    Args:
        app_id: 应用ID (可选)
        media_id: 媒体ID (可选)
        campaign_name: 活动名称 (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的监测活动列表
    """
    df = load_csv("ods_biz_campaign.csv")
    if df.empty:
        return {"success": False, "message": "监测活动表数据为空", "data": [], "api_route": "/api/v1/sr/ods_biz_campaign"}

    result = df.copy()
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if media_id:
        result = result[result['media_id'].astype(str) == str(media_id)]
    if campaign_name:
        result = result[result['campaign_name'].str.contains(campaign_name, na=False)]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_biz_campaign",
        "table_name_cn": "监测活动表",
        "api_route": "/api/v1/sr/ods_biz_campaign",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


@mcp.tool()
def sr_ods_uba_attr_event_rt_query(
    device_id: str = None,
    attr_source: str = None,
    app_id: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    SR点击归因表查询工具

    数据库类型: SR (StarRocks)
    目标表: ods_uba_attr_event_rt (点击归因表)
    API路由: /api/v1/sr/ods_uba_attr_event_rt
    Mock数据: data/ods_uba_attr_event_rt.csv

    关键字段: device_id, attr_source, app_id, attr_event_type, media_id

    Args:
        device_id: 设备ID (可选)
        attr_source: 归因来源 ad/natural (可选)
        app_id: 应用ID (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的点击归因事件列表
    """
    df = load_csv("ods_uba_attr_event_rt.csv")
    if df.empty:
        return {"success": False, "message": "点击归因表数据为空", "data": [], "api_route": "/api/v1/sr/ods_uba_attr_event_rt"}

    result = df.copy()
    if device_id:
        result = result[result['device_id'] == device_id]
    if attr_source:
        result = result[result['attr_source'] == attr_source]
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_uba_attr_event_rt",
        "table_name_cn": "点击归因表",
        "api_route": "/api/v1/sr/ods_uba_attr_event_rt",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


# ==================== MySQL表 Tools (严格命名: mysql_{table_name}_query) ====================

@mcp.tool()
def mysql_retry_query(
    app_id: str = None,
    retry_status: str = None,
    event_type: str = None,
    case_id: str = None,
    limit: int = 50
) -> dict:
    """
    MySQL回推失败重试表查询工具

    数据库类型: MySQL
    目标表: retry (回推失败重试表)
    API路由: /api/v1/mysql/retry
    Mock数据: data/retry.csv

    关键字段: app_id, retry_status, event_type, retry_count, create_time

    Args:
        app_id: 应用ID (可选)
        retry_status: 重试状态 WAITING/STOP/SUCCESS/VALIDATE_FAILED (可选)
        event_type: 事件类型 (可选)
        case_id: 测试用例ID (可选)
        limit: 返回记录数量限制

    Returns:
        匹配的重试记录列表
    """
    df = load_csv("retry.csv")
    if df.empty:
        return {"success": False, "message": "重试表数据为空", "data": [], "api_route": "/api/v1/mysql/retry"}

    result = df.copy()
    if app_id:
        result = result[result['app_id'].astype(str) == str(app_id)]
    if retry_status:
        result = result[result['retry_status'] == retry_status]
    if event_type:
        result = result[result['event_type'] == event_type]
    if case_id:
        result = result[result['case_id'] == case_id]

    return {
        "success": True,
        "db_type": "mysql",
        "table_name": "retry",
        "table_name_cn": "回推失败重试表",
        "api_route": "/api/v1/mysql/retry",
        "total": len(result),
        "returned": min(limit, len(result)),
        "data": df_to_records(result, limit)
    }


# ==================== 测试用例索引 Tools ====================

@mcp.tool()
def list_test_cases() -> dict:
    """
    列出所有测试用例

    Returns:
        测试用例列表 (15条成功 + 5条异常)
    """
    df = load_csv("test_case_index.csv")
    if df.empty:
        return {"success": False, "message": "测试用例索引为空", "data": []}

    return {"success": True, "total": len(df), "data": df_to_records(df, 100)}


@mcp.tool()
def get_test_case(case_id: str) -> dict:
    """
    获取指定测试用例详情

    Args:
        case_id: 测试用例ID (如 SUCCESS_001, ABNORMAL_001)

    Returns:
        测试用例详细信息
    """
    df = load_csv("test_case_index.csv")
    if df.empty:
        return {"success": False, "message": "测试用例索引为空", "data": None}

    result = df[df['case_id'] == case_id]
    if result.empty:
        return {"success": False, "message": f"未找到用例 {case_id}", "data": None}

    return {"success": True, "data": result.iloc[0].to_dict()}


# ==================== 长上下文读取 Tool ====================

@mcp.tool()
def read_long_context(filename: str, placeholder: str = None) -> dict:
    """
    读取长上下文日志文件

    Args:
        filename: 上下文日志文件名 (位于 data/context_logs/ 目录)
        placeholder: 可选的占位符名称

    Returns:
        文件内容
    """
    filepath = os.path.join(CONTEXT_LOG_DIR, filename)

    if not os.path.exists(filepath):
        return {"success": False, "message": f"文件不存在: {filename}"}

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if placeholder:
            placeholder_pattern = f"{{{{{placeholder}}}}}"
            if placeholder_pattern in content:
                content = content.replace(placeholder_pattern, f"[{placeholder} 内容已加载]")

        return {"success": True, "filename": filename, "content": content}
    except Exception as e:
        return {"success": False, "message": f"读取失败: {str(e)}"}


@mcp.tool()
def list_context_files() -> dict:
    """
    列出所有可用的上下文日志文件

    Returns:
        上下文日志文件列表
    """
    if not os.path.exists(CONTEXT_LOG_DIR):
        return {"success": False, "message": "上下文日志目录不存在", "files": []}

    files = []
    for f in os.listdir(CONTEXT_LOG_DIR):
        filepath = os.path.join(CONTEXT_LOG_DIR, f)
        if os.path.isfile(filepath):
            files.append({
                "filename": f,
                "size": os.path.getsize(filepath),
                "modified": datetime.fromtimestamp(os.path.getmtime(filepath)).strftime("%Y-%m-%d %H:%M:%S")
            })

    return {"success": True, "total": len(files), "files": files}


# ==================== 专家诊断SOP Tools ====================

@mcp.tool()
def diagnose_full_funnel(device_id: str, app_id: str) -> dict:
    """
    全链路归因诊断工具
    按"点击->激活->注册->付费->回推"漏斗进行时序校验

    Args:
        device_id: 设备ID或IDFA
        app_id: 项目ID

    Returns:
        漏斗诊断报告，包含各环节状态和诊断结论
    """
    # 加载数据
    click_df = load_csv("attr_click.csv")
    device_df = load_csv("attr_device.csv")
    activation_df = load_csv("attr_res_activation.csv")
    register_df = load_csv("attr_res_register.csv")
    pay_df = load_csv("attr_res_pay.csv")
    retry_df = load_csv("retry.csv")

    # 初始化诊断结果
    funnel = {
        "click": {"found": False, "time": None, "data": None},
        "activation": {"found": False, "time": None, "data": None},
        "register": {"found": False, "time": None, "data": None},
        "pay": {"found": False, "time": None, "amount": None, "data": None},
        "callback": {"found": False, "status": None, "data": None}
    }

    diagnosis = []
    diagnosis_code = "UNKNOWN"

    # Step 1: 查询点击 (点击表无device_id，通过idfa/oaid/android_id匹配)
    if not click_df.empty:
        # 先通过device表获取设备的idfa/oaid
        device_info = None
        if not device_df.empty:
            device_match = device_df[device_df['device_id'] == device_id]
            if not device_match.empty:
                device_info = device_match.iloc[0]

        # 构建点击查询条件
        click_match = pd.DataFrame()
        if device_info is not None:
            idfa = device_info.get('idfa', '')
            if idfa:
                click_match = click_df[click_df['idfa'] == idfa]
        # 如果device_id本身就是idfa格式，也尝试匹配
        if click_match.empty:
            click_match = click_df[click_df['idfa'] == device_id]

        if not click_match.empty:
            funnel["click"]["found"] = True
            funnel["click"]["time"] = click_match.iloc[0].get('data_time')
            funnel["click"]["data"] = click_match.iloc[0].to_dict()

    # Step 2: 查询激活
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == device_id) | (activation_df['idfa'] == device_id)) &
            (activation_df['app_id'].astype(str) == str(app_id))
        ]
        if not act_match.empty:
            funnel["activation"]["found"] = True
            funnel["activation"]["time"] = act_match.iloc[0].get('data_time')
            funnel["activation"]["data"] = act_match.iloc[0].to_dict()

    # Step 3: 查询注册
    if not register_df.empty:
        reg_match = register_df[
            ((register_df['device_id'] == device_id) | (register_df.get('idfa', pd.Series()) == device_id)) &
            (register_df['app_id'].astype(str) == str(app_id))
        ]
        if not reg_match.empty:
            funnel["register"]["found"] = True
            funnel["register"]["time"] = reg_match.iloc[0].get('register_time')
            funnel["register"]["data"] = reg_match.iloc[0].to_dict()

    # Step 4: 查询付费
    if not pay_df.empty:
        pay_match = pay_df[
            ((pay_df['device_id'] == device_id) | (pay_df.get('idfa', pd.Series()) == device_id)) &
            (pay_df['app_id'].astype(str) == str(app_id))
        ]
        if not pay_match.empty:
            funnel["pay"]["found"] = True
            funnel["pay"]["time"] = pay_match.iloc[0].get('pay_time')
            funnel["pay"]["amount"] = pay_match.iloc[0].get('amount')
            funnel["pay"]["data"] = pay_match.iloc[0].to_dict()

    # Step 5: 查询回推状态
    if not retry_df.empty:
        retry_match = retry_df[retry_df['app_id'].astype(str) == str(app_id)]
        if not retry_match.empty:
            # 检查是否有该设备的回推记录
            for _, row in retry_match.iterrows():
                msg = json.loads(row.get('message', '{}')) if isinstance(row.get('message'), str) else {}
                if msg.get('device_id') == device_id:
                    funnel["callback"]["found"] = True
                    funnel["callback"]["status"] = row.get('retry_status')
                    funnel["callback"]["data"] = row.to_dict()
                    break

    # 诊断逻辑
    if not funnel["click"]["found"] and not funnel["activation"]["found"]:
        diagnosis_code = "NO_DATA"
        diagnosis.append("❌ 该设备ID在所有表中均无记录")

    elif funnel["click"]["found"] and not funnel["activation"]["found"]:
        diagnosis_code = "CLICK_NO_ACTIVATION"
        diagnosis.append("❌ 链路中断: 有点击无激活")
        diagnosis.append("  → 检查: SDK是否正确集成、激活事件是否上报")

    elif not funnel["click"]["found"] and funnel["activation"]["found"]:
        diagnosis_code = "NATURAL"
        diagnosis.append("ℹ️ 自然量用户: 无点击记录，激活已归因为自然量")

    elif funnel["activation"]["found"] and not funnel["register"]["found"]:
        diagnosis_code = "ACTIVATION_NO_REGISTER"
        diagnosis.append("⚠️ 转化中断: 有激活无注册")
        diagnosis.append("  → 检查: 用户是否完成注册流程")

    elif funnel["register"]["found"] and not funnel["pay"]["found"]:
        diagnosis_code = "REGISTER_NO_PAY"
        diagnosis.append("⚠️ 付费流失: 有注册无付费")
        diagnosis.append("  → 检查: 用户付费意愿或付费流程")

    # 时序校验
    if funnel["click"]["found"] and funnel["activation"]["found"]:
        try:
            click_time = datetime.strptime(str(funnel["click"]["time"]), "%Y-%m-%d %H:%M:%S")
            act_time = datetime.strptime(str(funnel["activation"]["time"]), "%Y-%m-%d %H:%M:%S")
            if act_time < click_time:
                diagnosis_code = "TIME_SEQUENCE_ERROR"
                diagnosis.append("🚨 时序异常: 激活时间早于点击时间")
                diagnosis.append(f"  → 点击时间: {funnel['click']['time']}")
                diagnosis.append(f"  → 激活时间: {funnel['activation']['time']}")
                diagnosis.append("  → 可能原因: 时钟偏差、数据篡改、劫持")
        except:
            pass

    # 回推检查
    if funnel["callback"]["found"] and funnel["callback"]["status"] == "WAITING":
        diagnosis.append("⚠️ 回推状态: 等待重试中")
        diagnosis.append(f"  → 状态: {funnel['callback']['status']}")

    # 全链路成功
    if all([funnel["click"]["found"], funnel["activation"]["found"],
            funnel["register"]["found"], funnel["pay"]["found"]]):
        if diagnosis_code == "UNKNOWN":
            diagnosis_code = "FULL_SUCCESS"
            diagnosis.append("✅ 全链路归因成功")
            diagnosis.append(f"  → 点击: {funnel['click']['time']}")
            diagnosis.append(f"  → 激活: {funnel['activation']['time']}")
            diagnosis.append(f"  → 注册: {funnel['register']['time']}")
            diagnosis.append(f"  → 付费: {funnel['pay']['time']} (金额: {funnel['pay']['amount']})")

    return {
        "success": True,
        "device_id": device_id,
        "app_id": app_id,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "funnel": {
            "click": {"found": funnel["click"]["found"], "time": funnel["click"]["time"]},
            "activation": {"found": funnel["activation"]["found"], "time": funnel["activation"]["time"]},
            "register": {"found": funnel["register"]["found"], "time": funnel["register"]["time"]},
            "pay": {"found": funnel["pay"]["found"], "time": funnel["pay"]["time"], "amount": funnel["pay"]["amount"]},
            "callback": {"found": funnel["callback"]["found"], "status": funnel["callback"]["status"]}
        }
    }


@mcp.tool()
def diagnose_h5_app_link(device_id: str, app_id: str) -> dict:
    """
    H5+APP归因专项诊断
    检查H5跳转APP链路中的指纹归因、设备ID获取等问题

    Args:
        device_id: 设备ID
        app_id: 项目ID

    Returns:
        H5+APP链路诊断报告
    """
    activation_df = load_csv("attr_res_activation.csv")
    click_df = load_csv("attr_click.csv")

    diagnosis = []
    diagnosis_code = "UNKNOWN"

    # 查询激活记录
    act_match = None
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == device_id) | (activation_df['idfa'] == device_id)) &
            (activation_df['app_id'].astype(str) == str(app_id))
        ]

    if act_match is None or act_match.empty:
        diagnosis_code = "NO_ACTIVATION"
        diagnosis.append("❌ 未找到激活记录")
        return {"success": True, "diagnosis_code": diagnosis_code, "diagnosis": diagnosis}

    act_data = act_match.iloc[0]

    # 检查设备标识
    has_idfa = bool(act_data.get('idfa'))
    has_oaid = bool(act_data.get('oaid'))
    attr_fit_field = act_data.get('attr_fit_field', '')

    if not has_idfa and not has_oaid:
        diagnosis_code = "H5_TRACKING_BROKEN"
        diagnosis.append("🚨 H5追踪断链: 无标准设备ID")
        diagnosis.append("  → 检查: IDFA/OAID 获取是否正常")
        diagnosis.append("  → 检查: 指纹归因兜底是否触发")
    elif attr_fit_field in ['fingerprint', 'ip_ua']:
        diagnosis_code = "FINGERPRINT_FALLBACK"
        diagnosis.append("⚠️ 指纹归因兜底: 使用IP+UA匹配")
        diagnosis.append(f"  → 匹配字段: {attr_fit_field}")
        diagnosis.append("  → 注意: 指纹归因准确率较低")
    else:
        diagnosis_code = "STANDARD_MATCH"
        diagnosis.append("✅ 标准设备ID匹配成功")
        diagnosis.append(f"  → 匹配字段: {attr_fit_field}")
        if has_idfa:
            diagnosis.append(f"  → IDFA: {act_data.get('idfa')}")
        if has_oaid:
            diagnosis.append(f"  → OAID: {act_data.get('oaid')}")

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "device_info": {
            "has_idfa": has_idfa,
            "has_oaid": has_oaid,
            "attr_fit_field": attr_fit_field
        }
    }


@mcp.tool()
def diagnose_pc_tracking(device_id: str, app_id: str) -> dict:
    """
    PC端归因专项诊断
    检查web_device_id生成、追踪文件写入读取等问题

    Args:
        device_id: 设备ID或web_device_id
        app_id: 项目ID

    Returns:
        PC端归因诊断报告
    """
    click_df = load_csv("attr_click.csv")
    activation_df = load_csv("attr_res_activation.csv")
    device_df = load_csv("attr_device.csv")

    diagnosis = []
    diagnosis_code = "UNKNOWN"

    # 通过device表获取idfa用于点击表查询
    idfa = None
    if not device_df.empty:
        device_match = device_df[device_df['device_id'] == device_id]
        if not device_match.empty:
            idfa = device_match.iloc[0].get('idfa', '')

    # 查询点击记录 (点击表无device_id，通过idfa匹配)
    click_match = None
    if not click_df.empty and idfa:
        click_match = click_df[
            (click_df['idfa'] == idfa) &
            (click_df['app_id'].astype(str) == str(app_id))
        ]

    has_click = click_match is not None and not click_match.empty

    # 查询激活记录
    act_match = None
    if not activation_df.empty:
        act_match = activation_df[
            (activation_df['device_id'] == device_id) &
            (activation_df['app_id'].astype(str) == str(app_id))
        ]

    has_activation = act_match is not None and not act_match.empty

    if has_click and not has_activation:
        diagnosis_code = "PC_TRACKING_FAILED"
        diagnosis.append("🚨 PC文件追踪失败: 有Web点击但PC客户端未激活归因")
        diagnosis.append("  → 检查: 追踪文件是否成功写入")
        diagnosis.append("  → 检查: 客户端首次启动是否成功读取追踪文件")
        diagnosis.append("  → 文件路径: %APPDATA%/game_tracking.dat")
    elif has_click and has_activation:
        diagnosis_code = "PC_TRACKING_SUCCESS"
        diagnosis.append("✅ PC端归因成功")
        diagnosis.append(f"  → 点击时间: {click_match.iloc[0].get('data_time')}")
        diagnosis.append(f"  → 激活时间: {act_match.iloc[0].get('data_time')}")
    elif not has_click:
        diagnosis_code = "NO_WEB_CLICK"
        diagnosis.append("ℹ️ 未找到Web点击记录")
        diagnosis.append("  → 用户可能直接下载客户端")

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "tracking_info": {
            "has_web_click": has_click,
            "has_pc_activation": has_activation
        }
    }


@mcp.tool()
def diagnose_ios_fusion(device_id: str, app_id: str) -> dict:
    """
    iOS融合归因专项诊断
    检查融合归因版本、时间戳裁决等问题

    Args:
        device_id: 设备ID或IDFA
        app_id: 项目ID

    Returns:
        iOS融合归因诊断报告
    """
    activation_df = load_csv("attr_res_activation.csv")

    diagnosis = []
    diagnosis_code = "UNKNOWN"

    # 版本要求
    VERSION_REQUIREMENTS = {
        "10100001": "4.4.1",  # 三国杀
        "10100011": "1.0.328"  # 一将成名
    }

    # 查询激活记录
    act_match = None
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == device_id) | (activation_df['idfa'] == device_id)) &
            (activation_df['app_id'].astype(str) == str(app_id)) &
            (activation_df['os_type'].str.upper() == 'IOS')
        ]

    if act_match is None or act_match.empty:
        diagnosis_code = "NO_IOS_ACTIVATION"
        diagnosis.append("ℹ️ 未找到iOS激活记录")
        return {"success": True, "diagnosis_code": diagnosis_code, "diagnosis": diagnosis}

    act_data = act_match.iloc[0]

    # 检查是否使用了融合归因
    is_valid_fusion = act_data.get('is_valid_fusion', False)
    attr_way = act_data.get('attr_way', '')

    if is_valid_fusion or 'fusion' in str(attr_way).lower():
        diagnosis.append("✅ 已启用融合归因")

        # 检查版本要求
        if app_id in VERSION_REQUIREMENTS:
            required_version = VERSION_REQUIREMENTS[app_id]
            diagnosis.append(f"  → 版本要求: >= {required_version}")

        # 时间戳裁决检查
        attr_source = act_data.get('attr_source', '')
        if attr_source == 'natural':
            diagnosis_code = "FUSION_NATURAL"
            diagnosis.append("⚠️ 融合归因结果: 自然量")
            diagnosis.append("  → 时间戳裁决: 需检查是否正确取最近点击")
        else:
            diagnosis_code = "FUSION_AD"
            diagnosis.append("✅ 融合归因结果: 广告量")
    else:
        diagnosis_code = "NO_FUSION"
        diagnosis.append("ℹ️ 未使用融合归因")
        diagnosis.append(f"  → 当前归因方式: {attr_way}")

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "fusion_info": {
            "is_valid_fusion": is_valid_fusion,
            "attr_way": attr_way,
            "attr_source": act_data.get('attr_source', '')
        }
    }


# ==================== 启动服务 ====================

if __name__ == "__main__":
    mcp.run()
