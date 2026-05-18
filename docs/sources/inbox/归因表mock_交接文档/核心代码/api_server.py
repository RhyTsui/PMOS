# -*- coding: utf-8 -*-
"""
Ad-Expert V2 API Server
基于FastAPI封装归因诊断服务，为每个MCP Tool创建对应的POST路由
服务绑定: 0.0.0.0:8000
包含静态文件服务，支持直接访问联调看板
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import json
import os
from datetime import datetime

# 获取当前目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
WEB_DIR = os.path.join(BASE_DIR, "web")
CONTEXT_LOG_DIR = os.path.join(DATA_DIR, "context_logs")

app = FastAPI(
    title="Ad-Expert V2 API",
    description="广告归因诊断服务API - 为每个归因表提供独立查询接口",
    version="2.0.0"
)

# CORS配置 - 允许跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 表定义
TABLE_DEFINITIONS = [
    {"db_type": "es", "table_name": "attr_click", "table_name_cn": "媒体点击表", "csv_file": "attr_click.csv"},
    {"db_type": "es", "table_name": "attr_device", "table_name_cn": "全量设备表", "csv_file": "attr_device.csv"},
    {"db_type": "es", "table_name": "attr_user", "table_name_cn": "全量用户表", "csv_file": "attr_user.csv"},
    {"db_type": "es", "table_name": "attr_res_activation", "table_name_cn": "激活归因结果表", "csv_file": "attr_res_activation.csv"},
    {"db_type": "es", "table_name": "attr_res_register", "table_name_cn": "注册归因结果表", "csv_file": "attr_res_register.csv"},
    {"db_type": "es", "table_name": "attr_res_pay", "table_name_cn": "付费归因结果表", "csv_file": "attr_res_pay.csv"},
    {"db_type": "sr", "table_name": "ods_uba_base_event_rt", "table_name_cn": "基础原始事件表", "csv_file": "ods_uba_base_event_rt.csv"},
    {"db_type": "sr", "table_name": "ods_biz_campaign", "table_name_cn": "监测活动表", "csv_file": "ods_biz_campaign.csv"},
    {"db_type": "sr", "table_name": "ods_uba_attr_event_rt", "table_name_cn": "点击归因表", "csv_file": "ods_uba_attr_event_rt.csv"},
    {"db_type": "mysql", "table_name": "retry", "table_name_cn": "回推失败重试表", "csv_file": "retry.csv"},
]


# ==================== 数据加载 ====================

def load_csv(filename: str) -> pd.DataFrame:
    try:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath, encoding='utf-8-sig')
        return pd.DataFrame()
    except Exception as e:
        print(f"加载 {filename} 失败: {e}")
        return pd.DataFrame()


def df_to_records(df: pd.DataFrame, limit: int = 100) -> List[Dict]:
    if df.empty:
        return []
    df = df.fillna("")
    return df.head(limit).to_dict(orient='records')


# ==================== 请求模型 ====================

class DiagnoseRequest(BaseModel):
    device_id: str
    app_id: str


class EsAttrClickRequest(BaseModel):
    idfa: Optional[str] = None
    oaid: Optional[str] = None
    android_id: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    click_uuid: Optional[str] = None
    limit: Optional[int] = 50


class EsAttrDeviceRequest(BaseModel):
    device_id: Optional[str] = None
    idfa: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class EsAttrUserRequest(BaseModel):
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class EsAttrActivationRequest(BaseModel):
    device_id: Optional[str] = None
    idfa: Optional[str] = None
    app_id: Optional[str] = None
    attr_source: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class EsAttrRegisterRequest(BaseModel):
    device_id: Optional[str] = None
    user_id: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class EsAttrPayRequest(BaseModel):
    device_id: Optional[str] = None
    user_id: Optional[str] = None
    order_id: Optional[str] = None
    app_id: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class SrBaseEventRequest(BaseModel):
    device_id: Optional[str] = None
    event_type: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class SrCampaignRequest(BaseModel):
    app_id: Optional[str] = None
    media_id: Optional[str] = None
    campaign_name: Optional[str] = None
    limit: Optional[int] = 50


class SrAttrEventRequest(BaseModel):
    device_id: Optional[str] = None
    attr_source: Optional[str] = None
    app_id: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class MysqlRetryRequest(BaseModel):
    app_id: Optional[str] = None
    retry_status: Optional[str] = None
    event_type: Optional[str] = None
    case_id: Optional[str] = None
    limit: Optional[int] = 50


class QueryRequest(BaseModel):
    field: str
    value: str
    limit: Optional[int] = 50


class TimeRangeRequest(BaseModel):
    start_time: str
    end_time: str
    limit: Optional[int] = 100


# ==================== API路由 ====================

@app.get("/")
async def root():
    """根路径 - 返回服务信息或重定向到看板"""
    return {
        "service": "Ad-Expert V2 API",
        "version": "2.0.0",
        "status": "running",
        "dashboard": "http://localhost:8000/dashboard",
        "table_tools": {
            "es": {
                "attr_click": "/api/v1/es/attr_click",
                "attr_device": "/api/v1/es/attr_device",
                "attr_user": "/api/v1/es/attr_user",
                "attr_res_activation": "/api/v1/es/attr_res_activation",
                "attr_res_register": "/api/v1/es/attr_res_register",
                "attr_res_pay": "/api/v1/es/attr_res_pay"
            },
            "sr": {
                "ods_uba_base_event_rt": "/api/v1/sr/ods_uba_base_event_rt",
                "ods_biz_campaign": "/api/v1/sr/ods_biz_campaign",
                "ods_uba_attr_event_rt": "/api/v1/sr/ods_uba_attr_event_rt"
            },
            "mysql": {
                "retry": "/api/v1/mysql/retry"
            }
        },
        "diagnose": {
            "full": "/api/diagnose/full",
            "h5_app": "/api/diagnose/h5-app",
            "pc": "/api/diagnose/pc",
            "ios_fusion": "/api/diagnose/ios-fusion"
        },
        "test_cases": "/api/test-cases"
    }


# ==================== 静态文件和看板路由 ====================

@app.get("/dashboard")
async def dashboard():
    """返回联调看板HTML"""
    html_path = os.path.join(WEB_DIR, "dashboard.html")
    if os.path.exists(html_path):
        return FileResponse(html_path, media_type="text/html")
    return HTMLResponse("<h1>dashboard.html not found</h1>", status_code=404)


# ==================== ES表查询路由 ====================

@app.post("/api/v1/es/attr_click")
async def es_attr_click_query(req: EsAttrClickRequest):
    """
    ES媒体点击表查询
    对应MCP Tool: es_attr_click_query
    注意: 点击表无device_id字段，需通过idfa/oaid/android_id等设备标识查询
    """
    df = load_csv("attr_click.csv")
    if df.empty:
        return {"success": False, "message": "点击表数据为空", "data": [], "api_route": "/api/v1/es/attr_click"}

    result = df.copy()
    if req.idfa:
        result = result[result['idfa'] == req.idfa]
    if req.oaid:
        result = result[result['oaid'] == req.oaid]
    if req.android_id:
        result = result[result['android_id'] == req.android_id]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]
    if req.click_uuid:
        result = result[result['click_uuid'] == req.click_uuid]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_click",
        "table_name_cn": "媒体点击表",
        "api_route": "/api/v1/es/attr_click",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/es/attr_device")
async def es_attr_device_query(req: EsAttrDeviceRequest):
    """
    ES全量设备表查询
    对应MCP Tool: es_attr_device_query
    """
    df = load_csv("attr_device.csv")
    if df.empty:
        return {"success": False, "message": "设备表数据为空", "data": [], "api_route": "/api/v1/es/attr_device"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.idfa:
        result = result[result['idfa'] == req.idfa]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_device",
        "table_name_cn": "全量设备表",
        "api_route": "/api/v1/es/attr_device",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/es/attr_user")
async def es_attr_user_query(req: EsAttrUserRequest):
    """
    ES全量用户表查询
    对应MCP Tool: es_attr_user_query
    """
    df = load_csv("attr_user.csv")
    if df.empty:
        return {"success": False, "message": "用户表数据为空", "data": [], "api_route": "/api/v1/es/attr_user"}

    result = df.copy()
    if req.user_id:
        result = result[result['user_id'] == req.user_id]
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_user",
        "table_name_cn": "全量用户表",
        "api_route": "/api/v1/es/attr_user",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/es/attr_res_activation")
async def es_attr_res_activation_query(req: EsAttrActivationRequest):
    """
    ES激活归因结果表查询
    对应MCP Tool: es_attr_res_activation_query
    """
    df = load_csv("attr_res_activation.csv")
    if df.empty:
        return {"success": False, "message": "激活归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_activation"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.idfa:
        result = result[result['idfa'] == req.idfa]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.attr_source:
        result = result[result['attr_source'] == req.attr_source]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_activation",
        "table_name_cn": "激活归因结果表",
        "api_route": "/api/v1/es/attr_res_activation",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/es/attr_res_register")
async def es_attr_res_register_query(req: EsAttrRegisterRequest):
    """
    ES注册归因结果表查询
    对应MCP Tool: es_attr_res_register_query
    """
    df = load_csv("attr_res_register.csv")
    if df.empty:
        return {"success": False, "message": "注册归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_register"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.user_id:
        result = result[result['user_id'] == req.user_id]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_register",
        "table_name_cn": "注册归因结果表",
        "api_route": "/api/v1/es/attr_res_register",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/es/attr_res_pay")
async def es_attr_res_pay_query(req: EsAttrPayRequest):
    """
    ES付费归因结果表查询
    对应MCP Tool: es_attr_res_pay_query
    """
    df = load_csv("attr_res_pay.csv")
    if df.empty:
        return {"success": False, "message": "付费归因表数据为空", "data": [], "api_route": "/api/v1/es/attr_res_pay"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.user_id:
        result = result[result['user_id'] == req.user_id]
    if req.order_id:
        result = result[result['order_id'] == req.order_id]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.min_amount is not None:
        result = result[result['amount'] >= req.min_amount]
    if req.max_amount is not None:
        result = result[result['amount'] <= req.max_amount]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "es",
        "table_name": "attr_res_pay",
        "table_name_cn": "付费归因结果表",
        "api_route": "/api/v1/es/attr_res_pay",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


# ==================== SR表查询路由 ====================

@app.post("/api/v1/sr/ods_uba_base_event_rt")
async def sr_ods_uba_base_event_rt_query(req: SrBaseEventRequest):
    """
    SR基础原始事件表查询
    对应MCP Tool: sr_ods_uba_base_event_rt_query
    """
    df = load_csv("ods_uba_base_event_rt.csv")
    if df.empty:
        return {"success": False, "message": "基础事件表数据为空", "data": [], "api_route": "/api/v1/sr/ods_uba_base_event_rt"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.event_type:
        result = result[result['event_type'] == req.event_type]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_uba_base_event_rt",
        "table_name_cn": "基础原始事件表",
        "api_route": "/api/v1/sr/ods_uba_base_event_rt",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/sr/ods_biz_campaign")
async def sr_ods_biz_campaign_query(req: SrCampaignRequest):
    """
    SR监测活动表查询
    对应MCP Tool: sr_ods_biz_campaign_query
    """
    df = load_csv("ods_biz_campaign.csv")
    if df.empty:
        return {"success": False, "message": "监测活动表数据为空", "data": [], "api_route": "/api/v1/sr/ods_biz_campaign"}

    result = df.copy()
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.media_id:
        result = result[result['media_id'].astype(str) == str(req.media_id)]
    if req.campaign_name:
        result = result[result['campaign_name'].str.contains(req.campaign_name, na=False)]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_biz_campaign",
        "table_name_cn": "监测活动表",
        "api_route": "/api/v1/sr/ods_biz_campaign",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


@app.post("/api/v1/sr/ods_uba_attr_event_rt")
async def sr_ods_uba_attr_event_rt_query(req: SrAttrEventRequest):
    """
    SR点击归因表查询
    对应MCP Tool: sr_ods_uba_attr_event_rt_query
    """
    df = load_csv("ods_uba_attr_event_rt.csv")
    if df.empty:
        return {"success": False, "message": "点击归因表数据为空", "data": [], "api_route": "/api/v1/sr/ods_uba_attr_event_rt"}

    result = df.copy()
    if req.device_id:
        result = result[result['device_id'] == req.device_id]
    if req.attr_source:
        result = result[result['attr_source'] == req.attr_source]
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "sr",
        "table_name": "ods_uba_attr_event_rt",
        "table_name_cn": "点击归因表",
        "api_route": "/api/v1/sr/ods_uba_attr_event_rt",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


# ==================== MySQL表查询路由 ====================

@app.post("/api/v1/mysql/retry")
async def mysql_retry_query(req: MysqlRetryRequest):
    """
    MySQL回推失败重试表查询
    对应MCP Tool: mysql_retry_query
    """
    df = load_csv("retry.csv")
    if df.empty:
        return {"success": False, "message": "重试表数据为空", "data": [], "api_route": "/api/v1/mysql/retry"}

    result = df.copy()
    if req.app_id:
        result = result[result['app_id'].astype(str) == str(req.app_id)]
    if req.retry_status:
        result = result[result['retry_status'] == req.retry_status]
    if req.event_type:
        result = result[result['event_type'] == req.event_type]
    if req.case_id:
        result = result[result['case_id'] == req.case_id]

    return {
        "success": True,
        "db_type": "mysql",
        "table_name": "retry",
        "table_name_cn": "回推失败重试表",
        "api_route": "/api/v1/mysql/retry",
        "total": len(result),
        "returned": min(req.limit, len(result)),
        "data": df_to_records(result, req.limit)
    }


# ==================== 诊断接口 ====================

@app.post("/api/diagnose/full")
async def diagnose_full_funnel(req: DiagnoseRequest):
    """全链路归因诊断"""
    click_df = load_csv("attr_click.csv")
    activation_df = load_csv("attr_res_activation.csv")
    register_df = load_csv("attr_res_register.csv")
    pay_df = load_csv("attr_res_pay.csv")
    retry_df = load_csv("retry.csv")

    device_id = req.device_id
    app_id = req.app_id

    funnel = {
        "click": {"found": False, "time": None, "data": None},
        "activation": {"found": False, "time": None, "data": None},
        "register": {"found": False, "time": None, "data": None},
        "pay": {"found": False, "time": None, "amount": None, "data": None},
        "callback": {"found": False, "status": None, "data": None}
    }

    steps = []
    diagnosis_code = "UNKNOWN"

    # Step 1: 查询点击
    steps.append({"step": 1, "name": "查询点击记录", "status": "processing"})
    if not click_df.empty:
        click_match = click_df[(click_df['device_id'] == device_id) | (click_df['idfa'] == device_id)]
        if not click_match.empty:
            funnel["click"]["found"] = True
            funnel["click"]["time"] = click_match.iloc[0].get('data_time')
            funnel["click"]["data"] = click_match.iloc[0].to_dict()
            steps[-1]["status"] = "success"
            steps[-1]["result"] = f"找到点击记录，时间: {funnel['click']['time']}"
        else:
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "未找到点击记录"
    else:
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "点击表数据为空"

    # Step 2: 查询激活
    steps.append({"step": 2, "name": "查询激活归因", "status": "processing"})
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == device_id) | (activation_df['idfa'] == device_id)) &
            (activation_df['app_id'].astype(str) == str(app_id))
        ]
        if not act_match.empty:
            funnel["activation"]["found"] = True
            funnel["activation"]["time"] = act_match.iloc[0].get('data_time')
            funnel["activation"]["data"] = act_match.iloc[0].to_dict()
            steps[-1]["status"] = "success"
            steps[-1]["result"] = f"找到激活记录，时间: {funnel['activation']['time']}"
        else:
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "未找到激活记录"
    else:
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "激活表数据为空"

    # Step 3: 查询注册
    steps.append({"step": 3, "name": "查询注册归因", "status": "processing"})
    if not register_df.empty:
        reg_match = register_df[
            ((register_df['device_id'] == device_id) | (register_df.get('idfa', pd.Series()) == device_id)) &
            (register_df['app_id'].astype(str) == str(app_id))
        ]
        if not reg_match.empty:
            funnel["register"]["found"] = True
            funnel["register"]["time"] = reg_match.iloc[0].get('register_time')
            funnel["register"]["data"] = reg_match.iloc[0].to_dict()
            steps[-1]["status"] = "success"
            steps[-1]["result"] = f"找到注册记录，时间: {funnel['register']['time']}"
        else:
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "未找到注册记录"
    else:
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "注册表数据为空"

    # Step 4: 查询付费
    steps.append({"step": 4, "name": "查询付费归因", "status": "processing"})
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
            steps[-1]["status"] = "success"
            steps[-1]["result"] = f"找到付费记录，金额: {funnel['pay']['amount']}"
        else:
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "未找到付费记录"
    else:
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "付费表数据为空"

    # Step 5: 时序校验
    steps.append({"step": 5, "name": "时序校验", "status": "processing"})
    time_valid = True
    if funnel["click"]["found"] and funnel["activation"]["found"]:
        try:
            click_time = datetime.strptime(str(funnel["click"]["time"]), "%Y-%m-%d %H:%M:%S")
            act_time = datetime.strptime(str(funnel["activation"]["time"]), "%Y-%m-%d %H:%M:%S")
            if act_time < click_time:
                time_valid = False
                steps[-1]["status"] = "error"
                steps[-1]["result"] = f"时序异常: 激活时间({funnel['activation']['time']})早于点击时间({funnel['click']['time']})"
            else:
                steps[-1]["status"] = "success"
                steps[-1]["result"] = "时序正常: 点击 -> 激活"
        except:
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "无法解析时间进行校验"
    else:
        steps[-1]["status"] = "skipped"
        steps[-1]["result"] = "跳过时序校验(缺少点击或激活记录)"

    # Step 6: 诊断结论
    steps.append({"step": 6, "name": "生成诊断结论", "status": "processing"})
    diagnosis = []

    if not funnel["click"]["found"] and not funnel["activation"]["found"]:
        diagnosis_code = "NO_DATA"
        diagnosis.append("该设备ID在所有表中均无记录")
        steps[-1]["status"] = "error"
    elif funnel["click"]["found"] and not funnel["activation"]["found"]:
        diagnosis_code = "CLICK_NO_ACTIVATION"
        diagnosis.append("链路中断: 有点击无激活")
        steps[-1]["status"] = "error"
    elif not funnel["click"]["found"] and funnel["activation"]["found"]:
        diagnosis_code = "NATURAL"
        diagnosis.append("自然量用户: 无点击记录")
        steps[-1]["status"] = "info"
    elif not time_valid:
        diagnosis_code = "TIME_SEQUENCE_ERROR"
        diagnosis.append("时序异常: 激活时间早于点击时间")
        steps[-1]["status"] = "error"
    elif funnel["activation"]["found"] and not funnel["register"]["found"]:
        diagnosis_code = "ACTIVATION_NO_REGISTER"
        diagnosis.append("转化中断: 有激活无注册")
        steps[-1]["status"] = "warning"
    elif funnel["register"]["found"] and not funnel["pay"]["found"]:
        diagnosis_code = "REGISTER_NO_PAY"
        diagnosis.append("付费流失: 有注册无付费")
        steps[-1]["status"] = "warning"
    elif all([funnel["click"]["found"], funnel["activation"]["found"],
              funnel["register"]["found"], funnel["pay"]["found"]]):
        diagnosis_code = "FULL_SUCCESS"
        diagnosis.append("全链路归因成功")
        steps[-1]["status"] = "success"

    steps[-1]["result"] = " | ".join(diagnosis)

    return {
        "success": True,
        "device_id": device_id,
        "app_id": app_id,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "steps": steps,
        "funnel": {
            "click": {"found": funnel["click"]["found"], "time": funnel["click"]["time"]},
            "activation": {"found": funnel["activation"]["found"], "time": funnel["activation"]["time"]},
            "register": {"found": funnel["register"]["found"], "time": funnel["register"]["time"]},
            "pay": {"found": funnel["pay"]["found"], "time": funnel["pay"]["time"], "amount": funnel["pay"]["amount"]}
        }
    }


@app.post("/api/diagnose/h5-app")
async def diagnose_h5_app(req: DiagnoseRequest):
    """H5+APP归因专项诊断"""
    activation_df = load_csv("attr_res_activation.csv")

    steps = []
    diagnosis_code = "UNKNOWN"

    # Step 1: 查询激活记录
    steps.append({"step": 1, "name": "查询激活记录", "status": "processing"})

    act_match = None
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == req.device_id) | (activation_df['idfa'] == req.device_id)) &
            (activation_df['app_id'].astype(str) == str(req.app_id))
        ]

    if act_match is None or act_match.empty:
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "未找到激活记录"
        return {
            "success": True,
            "diagnosis_code": "NO_ACTIVATION",
            "diagnosis": ["未找到激活记录"],
            "steps": steps
        }

    steps[-1]["status"] = "success"
    steps[-1]["result"] = "找到激活记录"
    act_data = act_match.iloc[0]

    # Step 2: 检查设备标识
    steps.append({"step": 2, "name": "检查设备标识", "status": "processing"})
    has_idfa = bool(act_data.get('idfa'))
    has_oaid = bool(act_data.get('oaid'))
    attr_fit_field = act_data.get('attr_fit_field', '')

    diagnosis = []

    if not has_idfa and not has_oaid:
        diagnosis_code = "H5_TRACKING_BROKEN"
        diagnosis.append("H5追踪断链: 无标准设备ID")
        diagnosis.append("检查: IDFA/OAID 获取是否正常")
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "无标准设备ID"
    elif attr_fit_field in ['fingerprint', 'ip_ua']:
        diagnosis_code = "FINGERPRINT_FALLBACK"
        diagnosis.append("指纹归因兜底: 使用IP+UA匹配")
        diagnosis.append(f"匹配字段: {attr_fit_field}")
        steps[-1]["status"] = "warning"
        steps[-1]["result"] = f"指纹归因兜底, 匹配字段: {attr_fit_field}"
    else:
        diagnosis_code = "STANDARD_MATCH"
        diagnosis.append("标准设备ID匹配成功")
        diagnosis.append(f"匹配字段: {attr_fit_field}")
        steps[-1]["status"] = "success"
        steps[-1]["result"] = f"标准匹配, 字段: {attr_fit_field}"

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "steps": steps,
        "device_info": {
            "has_idfa": has_idfa,
            "has_oaid": has_oaid,
            "attr_fit_field": attr_fit_field
        }
    }


@app.post("/api/diagnose/pc")
async def diagnose_pc(req: DiagnoseRequest):
    """PC端归因专项诊断"""
    click_df = load_csv("attr_click.csv")
    activation_df = load_csv("attr_res_activation.csv")

    steps = []
    diagnosis = []
    diagnosis_code = "UNKNOWN"

    # Step 1: 查询Web点击
    steps.append({"step": 1, "name": "查询Web点击记录", "status": "processing"})
    has_click = False
    if not click_df.empty:
        click_match = click_df[
            (click_df['device_id'] == req.device_id) &
            (click_df['app_id'].astype(str) == str(req.app_id))
        ]
        has_click = not click_match.empty

    if has_click:
        steps[-1]["status"] = "success"
        steps[-1]["result"] = f"找到Web点击记录，时间: {click_match.iloc[0].get('data_time')}"
    else:
        steps[-1]["status"] = "warning"
        steps[-1]["result"] = "未找到Web点击记录"

    # Step 2: 查询PC激活
    steps.append({"step": 2, "name": "查询PC客户端激活", "status": "processing"})
    has_activation = False
    if not activation_df.empty:
        act_match = activation_df[
            (activation_df['device_id'] == req.device_id) &
            (activation_df['app_id'].astype(str) == str(req.app_id))
        ]
        has_activation = not act_match.empty

    if has_activation:
        steps[-1]["status"] = "success"
        steps[-1]["result"] = f"找到PC激活记录，时间: {act_match.iloc[0].get('data_time')}"
    else:
        steps[-1]["status"] = "warning"
        steps[-1]["result"] = "未找到PC激活记录"

    # Step 3: 诊断
    steps.append({"step": 3, "name": "PC追踪链路诊断", "status": "processing"})

    if has_click and not has_activation:
        diagnosis_code = "PC_TRACKING_FAILED"
        diagnosis.append("PC文件追踪失败: 有Web点击但PC客户端未激活归因")
        diagnosis.append("检查: 追踪文件是否成功写入")
        diagnosis.append("检查: 客户端首次启动是否成功读取追踪文件")
        steps[-1]["status"] = "error"
        steps[-1]["result"] = "PC追踪失败"
    elif has_click and has_activation:
        diagnosis_code = "PC_TRACKING_SUCCESS"
        diagnosis.append("PC端归因成功")
        steps[-1]["status"] = "success"
        steps[-1]["result"] = "PC追踪成功"
    elif not has_click:
        diagnosis_code = "NO_WEB_CLICK"
        diagnosis.append("未找到Web点击记录")
        diagnosis.append("用户可能直接下载客户端")
        steps[-1]["status"] = "info"
        steps[-1]["result"] = "无Web点击"

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "steps": steps,
        "tracking_info": {
            "has_web_click": has_click,
            "has_pc_activation": has_activation
        }
    }


@app.post("/api/diagnose/ios-fusion")
async def diagnose_ios_fusion(req: DiagnoseRequest):
    """iOS融合归因专项诊断"""
    activation_df = load_csv("attr_res_activation.csv")

    steps = []
    diagnosis = []
    diagnosis_code = "UNKNOWN"

    VERSION_REQUIREMENTS = {
        "10100001": "4.4.1",
        "10100011": "1.0.328"
    }

    # Step 1: 查询iOS激活记录
    steps.append({"step": 1, "name": "查询iOS激活记录", "status": "processing"})

    act_match = None
    if not activation_df.empty:
        act_match = activation_df[
            ((activation_df['device_id'] == req.device_id) | (activation_df['idfa'] == req.device_id)) &
            (activation_df['app_id'].astype(str) == str(req.app_id)) &
            (activation_df['os_type'].str.upper() == 'IOS')
        ]

    if act_match is None or act_match.empty:
        steps[-1]["status"] = "warning"
        steps[-1]["result"] = "未找到iOS激活记录"
        return {
            "success": True,
            "diagnosis_code": "NO_IOS_ACTIVATION",
            "diagnosis": ["未找到iOS激活记录"],
            "steps": steps
        }

    steps[-1]["status"] = "success"
    steps[-1]["result"] = "找到iOS激活记录"
    act_data = act_match.iloc[0]

    # Step 2: 检查融合归因状态
    steps.append({"step": 2, "name": "检查融合归因状态", "status": "processing"})
    is_valid_fusion = act_data.get('is_valid_fusion', False)
    attr_way = act_data.get('attr_way', '')

    if is_valid_fusion or 'fusion' in str(attr_way).lower():
        steps[-1]["status"] = "success"
        steps[-1]["result"] = "已启用融合归因"
        diagnosis.append("已启用融合归因")

        if req.app_id in VERSION_REQUIREMENTS:
            diagnosis.append(f"版本要求: >= {VERSION_REQUIREMENTS[req.app_id]}")

        # Step 3: 时间戳裁决检查
        steps.append({"step": 3, "name": "时间戳裁决检查", "status": "processing"})
        attr_source = act_data.get('attr_source', '')
        if attr_source == 'natural':
            diagnosis_code = "FUSION_NATURAL"
            diagnosis.append("融合归因结果: 自然量")
            diagnosis.append("时间戳裁决: 需检查是否正确取最近点击")
            steps[-1]["status"] = "warning"
            steps[-1]["result"] = "归因结果为自然量"
        else:
            diagnosis_code = "FUSION_AD"
            diagnosis.append("融合归因结果: 广告量")
            steps[-1]["status"] = "success"
            steps[-1]["result"] = "归因结果为广告量"
    else:
        diagnosis_code = "NO_FUSION"
        diagnosis.append("未使用融合归因")
        diagnosis.append(f"当前归因方式: {attr_way}")
        steps[-1]["status"] = "info"
        steps[-1]["result"] = f"未使用融合归因, 当前方式: {attr_way}"

    return {
        "success": True,
        "diagnosis_code": diagnosis_code,
        "diagnosis": diagnosis,
        "steps": steps,
        "fusion_info": {
            "is_valid_fusion": is_valid_fusion,
            "attr_way": attr_way,
            "attr_source": act_data.get('attr_source', '')
        }
    }


# ==================== 数据查询接口 ====================

@app.get("/api/tables")
async def list_tables():
    """列出所有可用数据表"""
    tables = [
        {"name": "attr_click", "description": "媒体点击表", "file": "attr_click.csv"},
        {"name": "attr_device", "description": "全量设备表", "file": "attr_device.csv"},
        {"name": "attr_user", "description": "全量用户表", "file": "attr_user.csv"},
        {"name": "attr_res_activation", "description": "激活归因结果表", "file": "attr_res_activation.csv"},
        {"name": "attr_res_register", "description": "注册归因结果表", "file": "attr_res_register.csv"},
        {"name": "attr_res_pay", "description": "付费归因结果表", "file": "attr_res_pay.csv"},
        {"name": "ods_uba_base_event_rt", "description": "基础原始事件表", "file": "ods_uba_base_event_rt.csv"},
        {"name": "ods_uba_attr_event_rt", "description": "点击归因表", "file": "ods_uba_attr_event_rt.csv"},
        {"name": "ods_biz_campaign", "description": "监测活动表", "file": "ods_biz_campaign.csv"},
        {"name": "retry", "description": "回推失败重试表", "file": "retry.csv"},
        {"name": "test_case_index", "description": "测试用例索引", "file": "test_case_index.csv"}
    ]

    for t in tables:
        df = load_csv(t["file"])
        t["row_count"] = len(df)
        t["columns"] = list(df.columns) if not df.empty else []

    return {"success": True, "tables": tables}


@app.get("/api/table/{table_name}")
async def query_table(
    table_name: str,
    limit: int = Query(50, ge=1, le=500),
    device_id: Optional[str] = None,
    idfa: Optional[str] = None,
    app_id: Optional[str] = None,
    case_id: Optional[str] = None
):
    """查询指定数据表"""
    file_map = {
        "attr_click": "attr_click.csv",
        "attr_device": "attr_device.csv",
        "attr_user": "attr_user.csv",
        "attr_res_activation": "attr_res_activation.csv",
        "attr_res_register": "attr_res_register.csv",
        "attr_res_pay": "attr_res_pay.csv",
        "ods_uba_base_event_rt": "ods_uba_base_event_rt.csv",
        "ods_uba_attr_event_rt": "ods_uba_attr_event_rt.csv",
        "ods_biz_campaign": "ods_biz_campaign.csv",
        "retry": "retry.csv",
        "test_case_index": "test_case_index.csv"
    }

    if table_name not in file_map:
        raise HTTPException(status_code=404, detail=f"表 {table_name} 不存在")

    df = load_csv(file_map[table_name])
    if df.empty:
        return {"success": True, "total": 0, "data": []}

    # 应用过滤条件
    if device_id and 'device_id' in df.columns:
        df = df[df['device_id'] == device_id]
    if idfa and 'idfa' in df.columns:
        df = df[df['idfa'] == idfa]
    if app_id and 'app_id' in df.columns:
        df = df[df['app_id'].astype(str) == str(app_id)]
    if case_id and 'case_id' in df.columns:
        df = df[df['case_id'] == case_id]

    return {
        "success": True,
        "total": len(df),
        "returned": min(limit, len(df)),
        "data": df_to_records(df, limit)
    }


# ==================== 测试用例接口 ====================

@app.get("/api/test-cases")
async def list_test_cases():
    """列出所有测试用例"""
    df = load_csv("test_case_index.csv")
    if df.empty:
        return {"success": False, "message": "测试用例索引为空", "data": []}

    return {"success": True, "total": len(df), "data": df_to_records(df, 100)}


@app.get("/api/test-cases/{case_id}")
async def get_test_case(case_id: str):
    """获取指定测试用例详情"""
    df = load_csv("test_case_index.csv")
    if df.empty:
        raise HTTPException(status_code=404, detail="测试用例索引为空")

    result = df[df['case_id'] == case_id]
    if result.empty:
        raise HTTPException(status_code=404, detail=f"未找到用例 {case_id}")

    return {"success": True, "data": result.iloc[0].to_dict()}


# ==================== 启动 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
