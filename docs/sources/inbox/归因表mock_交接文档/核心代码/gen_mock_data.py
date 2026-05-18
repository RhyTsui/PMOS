# -*- coding: utf-8 -*-
"""
Mock数据生成器 - 为归因表生成高保真测试数据
确保ID在点击、激活、归因、回推表中100%关联
包含15条成功案例 + 5条典型异常案例
"""

import pandas as pd
import numpy as np
import json
import uuid
import random
from datetime import datetime, timedelta
import os

OUTPUT_DIR = r"D:\ad_mcp_v2\data"

# 基础配置
APP_IDS = ["10100001", "10100002", "40100001"]
MEDIA_IDS = ["10001", "10002", "10003", "10004", "10005"]
OS_TYPES = ["android", "IOS", "harmony"]
CHANNELS = ["320001", "320002", "320003", "320004", "320005"]

# 生成唯一ID
def gen_uuid():
    return str(uuid.uuid4()).replace("-", "")[:32].upper()

def gen_device_id():
    return str(uuid.uuid4()).replace("-", "")[:16].lower()

def gen_user_id():
    return f"ykac{str(uuid.uuid4()).replace('-', '')[:12]}.dsp"

def gen_click_uuid(dt, idx):
    return f"{dt.strftime('%Y%m%d%H%M%S')}_{gen_uuid()[:8]}_{idx}"

def gen_order_id():
    return f"ORD{gen_uuid()[:16]}"

def gen_idfa():
    return str(uuid.uuid4()).upper().replace("-", "")[:32]

def gen_oaid():
    return str(uuid.uuid4()).lower()

# 时间生成器
def random_time(base_time, offset_minutes_min=0, offset_minutes_max=60):
    offset = timedelta(minutes=random.randint(offset_minutes_min, offset_minutes_max))
    return base_time + offset

def format_time(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")

# 生成案例数据
class CaseGenerator:
    def __init__(self):
        self.cases = []
        self.base_date = datetime(2026, 4, 10, 10, 0, 0)

    def gen_success_case(self, idx):
        """生成成功案例 - 完整链路: 点击->激活->注册->付费"""
        case_id = f"SUCCESS_{idx:03d}"
        device_id = gen_device_id()
        user_id = gen_user_id()
        idfa = gen_idfa()
        oaid = gen_oaid()
        app_id = random.choice(APP_IDS)
        media_id = random.choice(MEDIA_IDS)
        os_type = random.choice(OS_TYPES)
        channel = random.choice(CHANNELS)

        # 时间链路: 点击 < 激活 < 注册 < 付费
        click_time = random_time(self.base_date + timedelta(days=idx), 0, 30)
        activate_time = random_time(click_time, 5, 60)  # 激活在点击后5-60分钟
        register_time = random_time(activate_time, 10, 120)  # 注册在激活后10-120分钟
        pay_time = random_time(register_time, 30, 480)  # 付费在注册后30分钟到8小时

        return {
            "case_id": case_id,
            "case_type": "success",
            "device_id": device_id,
            "user_id": user_id,
            "idfa": idfa,
            "oaid": oaid,
            "app_id": app_id,
            "media_id": media_id,
            "os_type": os_type,
            "channel": channel,
            "click_time": click_time,
            "activate_time": activate_time,
            "register_time": register_time,
            "pay_time": pay_time,
            "pay_amount": round(random.uniform(6, 648), 2),
            "attr_source": "ad",
            "description": "完整归因链路成功"
        }

    def gen_abnormal_case(self, idx, abnormal_type):
        """生成异常案例"""
        case_id = f"ABNORMAL_{idx:03d}"
        device_id = gen_device_id()
        user_id = gen_user_id()
        idfa = gen_idfa()
        oaid = gen_oaid()
        app_id = random.choice(APP_IDS)
        media_id = random.choice(MEDIA_IDS)
        os_type = random.choice(OS_TYPES)
        channel = random.choice(CHANNELS)

        base_time = random_time(self.base_date + timedelta(days=15+idx), 0, 30)

        case = {
            "case_id": case_id,
            "case_type": abnormal_type,
            "device_id": device_id,
            "user_id": user_id,
            "idfa": idfa,
            "oaid": oaid,
            "app_id": app_id,
            "media_id": media_id,
            "os_type": os_type,
            "channel": channel,
            "attr_source": "natural" if abnormal_type == "no_click" else "ad",
        }

        if abnormal_type == "time_sequence_error":
            # 时序异常: 激活时间早于点击时间
            case["click_time"] = base_time
            case["activate_time"] = base_time - timedelta(hours=2)  # 激活比点击早
            case["register_time"] = random_time(base_time, 30, 120)
            case["pay_time"] = random_time(case["register_time"], 60, 240)
            case["pay_amount"] = round(random.uniform(6, 128), 2)
            case["description"] = "时序异常-激活早于点击"

        elif abnormal_type == "no_click":
            # 无点击归因: 自然量
            case["click_time"] = None
            case["activate_time"] = base_time
            case["register_time"] = random_time(base_time, 30, 120)
            case["pay_time"] = random_time(case["register_time"], 60, 240)
            case["pay_amount"] = round(random.uniform(6, 128), 2)
            case["description"] = "无点击归因-自然量"

        elif abnormal_type == "activation_only":
            # 只有激活无后续
            case["click_time"] = base_time
            case["activate_time"] = random_time(base_time, 5, 30)
            case["register_time"] = None
            case["pay_time"] = None
            case["pay_amount"] = None
            case["description"] = "只有激活无注册-流失"

        elif abnormal_type == "no_pay":
            # 有注册无付费
            case["click_time"] = base_time
            case["activate_time"] = random_time(base_time, 5, 30)
            case["register_time"] = random_time(case["activate_time"], 10, 60)
            case["pay_time"] = None
            case["pay_amount"] = None
            case["description"] = "有注册无付费-付费流失"

        elif abnormal_type == "callback_failed":
            # 回推失败
            case["click_time"] = base_time
            case["activate_time"] = random_time(base_time, 5, 30)
            case["register_time"] = random_time(case["activate_time"], 10, 60)
            case["pay_time"] = random_time(case["register_time"], 30, 120)
            case["pay_amount"] = round(random.uniform(6, 128), 2)
            case["callback_failed"] = True
            case["description"] = "回推失败-需重试"

        return case

    def generate_all(self):
        """生成所有案例: 15成功 + 5异常"""
        cases = []

        # 15个成功案例
        for i in range(15):
            cases.append(self.gen_success_case(i))

        # 5个异常案例
        abnormal_types = ["time_sequence_error", "no_click", "activation_only", "no_pay", "callback_failed"]
        for i, atype in enumerate(abnormal_types):
            cases.append(self.gen_abnormal_case(i, atype))

        return cases


def generate_click_table(cases):
    """生成媒体点击表: attr_click_yyyymmdd"""
    rows = []
    for c in cases:
        if c["click_time"] is None:
            continue
        rows.append({
            "click_uuid": gen_click_uuid(c["click_time"], len(rows)),
            "app_id": c["app_id"],
            "media_id": c["media_id"],
            "os_type": c["os_type"],
            "os_version": "14.0" if c["os_type"] == "android" else "18.7" if c["os_type"] == "IOS" else "5.0",
            "mac": "",
            "idfa": c["idfa"],
            "imei": "",
            "oaid": c["oaid"] if c["os_type"] == "android" else "",
            "data_time": format_time(c["click_time"]),
            "start_time": format_time(c["click_time"]),
            "receive_time": format_time(c["click_time"]),
            "model": "Xiaomi 14" if c["os_type"] == "android" else "iPhone 15 Pro" if c["os_type"] == "IOS" else "Huawei Mate 60",
            "android_id": gen_uuid()[:16] if c["os_type"] == "android" else "",
            "attr_campaign_id": f"10007{random.randint(1000000, 9999999)}",
            "ori_attr_campaign_id": "",
            "channel_id": c["channel"],
            "action_type": "DOWNLOAD",
            "ip": f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
            "ipv4": f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
            "ipv6": "",
            "caid1": gen_uuid(),
            "caid2": gen_uuid(),
            "device_digest1": "",
            "device_digest2": "",
            "device_digest3": gen_uuid(),
            "device_digest4": gen_uuid(),
            "data_day": c["click_time"].strftime("%Y-%m-%d"),
            "data_hour": c["click_time"].strftime("%Y-%m-%d %H:00"),
            "case_id": c["case_id"],
            "device_id": c["device_id"]
        })
    return pd.DataFrame(rows)


def generate_device_table(cases):
    """生成全量设备表: attr_device_{app_id}"""
    rows = []
    for c in cases:
        if c["activate_time"] is None:
            continue
        rows.append({
            "app_id": c["app_id"],
            "device_id": c["device_id"],
            "open_id": "",
            "os_type": c["os_type"],
            "create_time": format_time(c["activate_time"]),
            "uuid": gen_uuid(),
            "ori_device_id": c["device_id"],
            "channel": c["channel"],
            "idfv": gen_uuid() if c["os_type"] == "IOS" else "",
            "login_from": "",
            "master_id": "",
            "cpsid": f"32000{random.randint(100,999)}",
            "last_idfv": "",
            "active_time": format_time(c["activate_time"]),
            "last_launch_time": format_time(c["activate_time"]),
            "update_time": format_time(c["activate_time"]),
            "device_type": "",
            "receive_time": int(c["activate_time"].timestamp() * 1000),
            "sub_platform": "APP",
            "user_name": "",
            "app_type": "APP",
            "app_package_type": c["os_type"].upper() if c["os_type"] != "harmony" else "HARMONY",
            "unique_id": "",
            "api_push_status": "",
            "push_sdk_id": "",
            "init_status": "",
            "valid_fusion_sdk": random.choice([True, False]),
            "support_fusion_sdk_ids": "",
            "paid": c.get("pay_amount") is not None,
            "new_sdk": random.choice([True, False]),
            "case_id": c["case_id"],
            "idfa": c["idfa"]
        })
    return pd.DataFrame(rows)


def generate_user_table(cases):
    """生成全量用户表: attr_user_{app_id}"""
    rows = []
    for c in cases:
        if c["register_time"] is None:
            continue
        rows.append({
            "app_id": c["app_id"],
            "user_id": c["user_id"],
            "device_id": c["device_id"],
            "create_time": format_time(c["register_time"]),
            "os_type": c["os_type"],
            "open_id": "",
            "uuid": gen_uuid(),
            "ori_device_id": c["device_id"],
            "channel": c["channel"],
            "login_from": "",
            "server": f"S{random.randint(1,100)}",
            "cpsid": f"32000{random.randint(100,999)}",
            "encrypted_user_id": gen_uuid(),
            "valid_flag": True,
            "register_time": format_time(c["register_time"]),
            "last_login_time": format_time(c["register_time"]),
            "update_time": format_time(c["register_time"]),
            "device_type": "",
            "receive_time": int(c["register_time"].timestamp() * 1000),
            "sub_platform": "APP",
            "case_id": c["case_id"],
            "idfa": c["idfa"]
        })
    return pd.DataFrame(rows)


def generate_activation_result_table(cases):
    """生成激活归因结果表: attr_res_activation_{app_id}"""
    rows = []
    for c in cases:
        if c["activate_time"] is None:
            continue

        click_info = {}
        if c["click_time"]:
            click_info = {
                "click_uuid": gen_click_uuid(c["click_time"], 0),
                "click_time": format_time(c["click_time"]),
                "media_id": c["media_id"]
            }

        rows.append({
            "ad_platform_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "app_id": c["app_id"],
            "app_package_name": f"com.game.{c['app_id']}",
            "app_package_type": c["os_type"].upper() if c["os_type"] != "harmony" else "HARMONY",
            "attr_app_name": "attr-engine",
            "attr_begin_time": format_time(c["activate_time"] - timedelta(seconds=1)),
            "attr_campaign_id": f"10007{random.randint(1000000, 9999999)}" if c["attr_source"] == "ad" else "",
            "attr_finish_time": format_time(c["activate_time"]),
            "attr_fit_field": "idfa" if c["os_type"] == "IOS" else "oaid",
            "attr_match_fields": json.dumps(["idfa", "oaid", "device_id"]),
            "attr_receive_time": format_time(c["activate_time"]),
            "attr_source": c["attr_source"],
            "attr_times": 1,
            "attr_took_seconds": round(random.uniform(0.1, 2.0), 3),
            "attr_took_seconds_bucket": "0-2s",
            "attr_type": "newcomer",
            "attr_type_parent": "activation",
            "attr_way": "last_click" if c["attr_source"] == "ad" else "natural",
            "channel": c["channel"],
            "click_info": json.dumps(click_info),
            "click_uuid": click_info.get("click_uuid", ""),
            "data_day": c["activate_time"].strftime("%Y-%m-%d"),
            "data_hour": c["activate_time"].strftime("%Y-%m-%d %H:00"),
            "data_time": format_time(c["activate_time"]),
            "device_id": c["device_id"],
            "idfa": c["idfa"],
            "imei": "",
            "is_new_user": True,
            "is_valid_fusion": random.choice([True, False]),
            "is_valid_sdk": True,
            "media_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "oaid": c["oaid"] if c["os_type"] == "android" else "",
            "os_type": c["os_type"],
            "os_version": "14.0" if c["os_type"] == "android" else "18.7",
            "receive_time": format_time(c["activate_time"]),
            "event_type": "activation",
            "case_id": c["case_id"]
        })
    return pd.DataFrame(rows)


def generate_register_result_table(cases):
    """生成注册归因结果表: attr_res_register_{app_id}"""
    rows = []
    for c in cases:
        if c["register_time"] is None:
            continue

        rows.append({
            "ad_platform_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "app_id": c["app_id"],
            "app_package_name": f"com.game.{c['app_id']}",
            "app_package_type": c["os_type"].upper() if c["os_type"] != "harmony" else "HARMONY",
            "attr_app_name": "attr-engine",
            "attr_begin_time": format_time(c["register_time"] - timedelta(seconds=1)),
            "attr_campaign_id": f"10007{random.randint(1000000, 9999999)}" if c["attr_source"] == "ad" else "",
            "attr_finish_time": format_time(c["register_time"]),
            "attr_fit_field": "device_id",
            "attr_match_fields": json.dumps(["device_id", "user_id"]),
            "attr_receive_time": format_time(c["register_time"]),
            "attr_source": c["attr_source"],
            "attr_times": 1,
            "attr_took_seconds": round(random.uniform(0.1, 1.5), 3),
            "attr_took_seconds_bucket": "0-2s",
            "attr_type": "register",
            "attr_type_parent": "register",
            "attr_way": "activation_inherit",
            "channel": c["channel"],
            "click_info": "{}",
            "click_uuid": "",
            "data_day": c["register_time"].strftime("%Y-%m-%d"),
            "data_hour": c["register_time"].strftime("%Y-%m-%d %H:00"),
            "data_time": format_time(c["register_time"]),
            "device_id": c["device_id"],
            "idfa": c["idfa"],
            "imei": "",
            "is_new_user": True,
            "media_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "oaid": c["oaid"] if c["os_type"] == "android" else "",
            "os_type": c["os_type"],
            "os_version": "14.0" if c["os_type"] == "android" else "18.7",
            "register_time": format_time(c["register_time"]),
            "receive_time": format_time(c["register_time"]),
            "event_type": "register",
            "user_id": c["user_id"],
            "case_id": c["case_id"]
        })
    return pd.DataFrame(rows)


def generate_pay_result_table(cases):
    """生成付费归因结果表: attr_res_pay_{app_id}"""
    rows = []
    for c in cases:
        if c["pay_time"] is None or c["pay_amount"] is None:
            continue

        rows.append({
            "ad_platform_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "amount": c["pay_amount"],
            "app_id": c["app_id"],
            "app_package_name": f"com.game.{c['app_id']}",
            "app_package_type": c["os_type"].upper() if c["os_type"] != "harmony" else "HARMONY",
            "attr_app_name": "attr-engine",
            "attr_begin_time": format_time(c["pay_time"] - timedelta(seconds=1)),
            "attr_campaign_id": f"10007{random.randint(1000000, 9999999)}" if c["attr_source"] == "ad" else "",
            "attr_finish_time": format_time(c["pay_time"]),
            "attr_fit_field": "device_id",
            "attr_match_fields": json.dumps(["device_id", "user_id"]),
            "attr_receive_time": format_time(c["pay_time"]),
            "attr_source": c["attr_source"],
            "attr_times": 1,
            "attr_took_seconds": round(random.uniform(0.1, 1.0), 3),
            "attr_took_seconds_bucket": "0-2s",
            "attr_type": "pay",
            "attr_type_parent": "pay",
            "attr_way": "activation_inherit",
            "channel": c["channel"],
            "click_info": "{}",
            "click_uuid": "",
            "currency": "CNY",
            "data_day": c["pay_time"].strftime("%Y-%m-%d"),
            "data_hour": c["pay_time"].strftime("%Y-%m-%d %H:00"),
            "data_time": format_time(c["pay_time"]),
            "device_id": c["device_id"],
            "idfa": c["idfa"],
            "imei": "",
            "is_new_user": True,
            "media_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "oaid": c["oaid"] if c["os_type"] == "android" else "",
            "order_id": gen_order_id(),
            "os_type": c["os_type"],
            "os_version": "14.0" if c["os_type"] == "android" else "18.7",
            "pay_time": format_time(c["pay_time"]),
            "product_id": f"PROD{random.randint(1000,9999)}",
            "receive_time": format_time(c["pay_time"]),
            "event_type": "pay",
            "user_id": c["user_id"],
            "case_id": c["case_id"]
        })
    return pd.DataFrame(rows)


def generate_base_event_table(cases):
    """生成基础原始事件表: ods_uba_base_event_rt"""
    rows = []
    for c in cases:
        # 激活事件
        if c["activate_time"]:
            rows.append({
                "dt": c["activate_time"].strftime("%Y-%m-%d"),
                "data_time": format_time(c["activate_time"]),
                "app_id": c["app_id"],
                "event_type": "activation",
                "device_id": c["device_id"],
                "user_id": "",
                "role_id": "",
                "os_type": c["os_type"],
                "app_package_type": c["os_type"].upper(),
                "uuid": gen_uuid(),
                "case_id": c["case_id"]
            })
        # 注册事件
        if c["register_time"]:
            rows.append({
                "dt": c["register_time"].strftime("%Y-%m-%d"),
                "data_time": format_time(c["register_time"]),
                "app_id": c["app_id"],
                "event_type": "register",
                "device_id": c["device_id"],
                "user_id": c["user_id"],
                "role_id": "",
                "os_type": c["os_type"],
                "app_package_type": c["os_type"].upper(),
                "uuid": gen_uuid(),
                "case_id": c["case_id"]
            })
        # 付费事件
        if c["pay_time"]:
            rows.append({
                "dt": c["pay_time"].strftime("%Y-%m-%d"),
                "data_time": format_time(c["pay_time"]),
                "app_id": c["app_id"],
                "event_type": "pay",
                "device_id": c["device_id"],
                "user_id": c["user_id"],
                "role_id": "",
                "os_type": c["os_type"],
                "app_package_type": c["os_type"].upper(),
                "uuid": gen_uuid(),
                "case_id": c["case_id"]
            })
    return pd.DataFrame(rows)


def generate_attr_event_table(cases):
    """生成点击归因表: ods_uba_attr_event_rt"""
    rows = []
    for c in cases:
        if c["activate_time"] is None:
            continue
        rows.append({
            "dt": c["activate_time"].strftime("%Y-%m-%d"),
            "data_time": format_time(c["activate_time"]),
            "app_id": c["app_id"],
            "attr_event_type": "activation",
            "attr_type": "newcomer",
            "attr_source": c["attr_source"],
            "attr_campaign_id": f"10007{random.randint(1000000, 9999999)}" if c["attr_source"] == "ad" else "",
            "device_id": c["device_id"],
            "user_id": c.get("user_id", ""),
            "os_type": c["os_type"],
            "media_id": c["media_id"] if c["attr_source"] == "ad" else "",
            "channel": c["channel"],
            "case_id": c["case_id"]
        })
    return pd.DataFrame(rows)


def generate_retry_table(cases):
    """生成回推失败重试表: retry"""
    rows = []
    for c in cases:
        if c.get("callback_failed"):
            rows.append({
                "id": len(rows) + 1,
                "unique_key": gen_uuid(),
                "app_id": c["app_id"],
                "event_type": "activation",
                "message": json.dumps({
                    "device_id": c["device_id"],
                    "media_id": c["media_id"],
                    "callback_url": f"https://api.media.com/callback/{c['media_id']}"
                }),
                "retry_type": "RETRY",
                "retry_status": "WAITING",
                "cause": "Connection timeout",
                "retry_count": random.randint(1, 3),
                "max_retry_count": 3,
                "create_time": format_time(c["activate_time"]),
                "update_time": format_time(c["activate_time"] + timedelta(minutes=5)),
                "next_retry_time": format_time(c["activate_time"] + timedelta(minutes=10)),
                "case_id": c["case_id"]
            })
    return pd.DataFrame(rows)


def generate_campaign_table(cases):
    """生成监测活动表: ods_biz_sunrise_attribution_campaign_rt"""
    # 生成一些通用的活动记录
    rows = []
    for i, media_id in enumerate(MEDIA_IDS):
        for app_id in APP_IDS:
            rows.append({
                "biz_env": "PRD",
                "id": len(rows) + 1,
                "parent_id": None,
                "company_id": 1001,
                "campaign_name": f"活动_{media_id}_{app_id}",
                "app_id": app_id,
                "promotion_type": "链接推广",
                "short_id": gen_uuid()[:8],
                "media_id": media_id,
                "status": "ACTIVE",
                "create_time": "2026-04-01 00:00:00",
                "update_time": "2026-04-01 00:00:00"
            })
    return pd.DataFrame(rows)


def generate_test_case_index(cases):
    """生成测试用例索引表"""
    rows = []
    for c in cases:
        rows.append({
            "case_id": c["case_id"],
            "case_type": c["case_type"],
            "description": c["description"],
            "device_id": c["device_id"],
            "user_id": c.get("user_id", ""),
            "idfa": c["idfa"],
            "oaid": c["oaid"],
            "app_id": c["app_id"],
            "media_id": c["media_id"],
            "os_type": c["os_type"],
            "click_time": format_time(c["click_time"]) if c["click_time"] else "",
            "activate_time": format_time(c["activate_time"]) if c["activate_time"] else "",
            "register_time": format_time(c["register_time"]) if c["register_time"] else "",
            "pay_time": format_time(c["pay_time"]) if c["pay_time"] else "",
            "pay_amount": c.get("pay_amount", ""),
            "attr_source": c["attr_source"]
        })
    return pd.DataFrame(rows)


def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("开始生成Mock数据...")

    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "context_logs"), exist_ok=True)

    # 生成案例
    gen = CaseGenerator()
    cases = gen.generate_all()
    print(f"生成 {len(cases)} 个测试案例 (15成功 + 5异常)")

    # 生成各表数据
    tables = {
        "attr_click.csv": generate_click_table(cases),
        "attr_device.csv": generate_device_table(cases),
        "attr_user.csv": generate_user_table(cases),
        "attr_res_activation.csv": generate_activation_result_table(cases),
        "attr_res_register.csv": generate_register_result_table(cases),
        "attr_res_pay.csv": generate_pay_result_table(cases),
        "ods_uba_base_event_rt.csv": generate_base_event_table(cases),
        "ods_uba_attr_event_rt.csv": generate_attr_event_table(cases),
        "ods_biz_campaign.csv": generate_campaign_table(cases),
        "retry.csv": generate_retry_table(cases),
        "test_case_index.csv": generate_test_case_index(cases)
    }

    # 保存CSV
    for filename, df in tables.items():
        filepath = os.path.join(OUTPUT_DIR, filename)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        print(f"  ✓ {filename}: {len(df)} 条记录")

    # 生成长上下文示例文件
    context_content = """# 归因诊断上下文日志

## {{LONG_TEXT_1}} - 用户行为轨迹
用户从广告点击到最终付费的完整行为链路记录。

## 时间线
1. 点击广告 -> 跳转落地页
2. 下载安装APP
3. 首次激活
4. 注册账号
5. 完成首充

## 诊断要点
- 检查时序是否正确
- 验证设备ID关联
- 确认归因窗口期
"""
    with open(os.path.join(OUTPUT_DIR, "context_logs", "sample_context.txt"), "w", encoding="utf-8") as f:
        f.write(context_content)
    print(f"  ✓ context_logs/sample_context.txt: 示例上下文")

    print("\n✅ Mock数据生成完成!")
    print(f"输出目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
