#!/usr/bin/env python3
"""
通过超管权限，根据目标用户邮箱获取其 API Key。

支持两种认证方式（优先级从高到低）：
  1. --token        直接传入 JWT（扫码登录后从浏览器复制）
  2. --admin-email + --admin-password  密码登录

注意：不能用 API Key，因为跨租户查询需要 CanAccessAllTenants 权限，
只有 JWT 认证路径才会从数据库加载真实用户的权限字段。

用法：
  # 方式1：JWT（扫码登录后从浏览器 DevTools / Network / localStorage 复制）
  python get_user_api_key.py --target-email user@example.com --token "eyJ..."

  # 方式2：密码登录
  python get_user_api_key.py --target-email user@example.com \\
      --admin-email admin@example.com --admin-password xxx

环境变量：
  WEKNORA_BASE_URL        默认 http://localhost:8080
  WEKNORA_TOKEN           JWT token
  WEKNORA_ADMIN_EMAIL     超管邮箱
  WEKNORA_ADMIN_PASSWORD  超管密码
"""

import argparse
import os
import sys
import requests


def get_token(args: argparse.Namespace) -> str:
    """获取认证凭据，优先级：--token > 密码登录"""
    if args.token:
        return args.token

    if args.admin_email and args.admin_password:
        resp = requests.post(
            f"{args.base_url}/api/v1/auth/login",
            json={"email": args.admin_email, "password": args.admin_password},
            timeout=15,
        )
        data = resp.json()
        if not data.get("success"):
            sys.exit(f"登录失败: {data.get('message', resp.text)}")
        token = data.get("token") or data.get("access_token")
        if not token:
            sys.exit("登录成功但未返回 token")
        return token

    sys.exit(
        "请提供认证凭据之一：\n"
        "  --token  (扫码登录后从浏览器复制 JWT)\n"
        "  --admin-email + --admin-password  (密码登录)"
    )


def auth_headers(token: str | None) -> dict:
    """构造认证请求头"""
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def search_tenants(base_url: str, headers: dict, keyword: str) -> list[dict]:
    """按关键词搜索租户"""
    resp = requests.get(
        f"{base_url}/api/v1/tenants/search",
        params={"keyword": keyword, "page": 1, "page_size": 50},
        headers=headers,
        timeout=15,
    )
    data = resp.json()
    if not data.get("success"):
        sys.exit(f"搜索租户失败: {data.get('message', resp.text)}")
    return data.get("data", {}).get("items", [])


def list_all_tenants(base_url: str, headers: dict) -> list[dict]:
    """列出所有租户（需要跨租户权限）"""
    resp = requests.get(
        f"{base_url}/api/v1/tenants/all",
        headers=headers,
        timeout=15,
    )
    data = resp.json()
    if not data.get("success"):
        sys.exit(f"列出租户失败: {data.get('message', resp.text)}")
    return data.get("data", {}).get("items", [])


def get_tenant(base_url: str, headers: dict, tenant_id: int) -> dict:
    """获取指定租户详情（含 api_key）"""
    resp = requests.get(
        f"{base_url}/api/v1/tenants/{tenant_id}",
        headers=headers,
        timeout=15,
    )
    data = resp.json()
    if not data.get("success"):
        sys.exit(f"获取租户失败 (id={tenant_id}): {data.get('message', resp.text)}")
    return data.get("data", {})


def get_my_info(base_url: str, headers: dict) -> dict:
    """获取当前用户自己的信息（含自己的 tenant 和 api_key）"""
    resp = requests.get(
        f"{base_url}/api/v1/auth/me",
        headers=headers,
        timeout=15,
    )
    data = resp.json()
    if not data.get("success"):
        sys.exit(f"获取用户信息失败: {data.get('message', resp.text)}")
    return data.get("data", {})


def main():
    parser = argparse.ArgumentParser(description="通过超管权限获取目标用户的 API Key")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("WEKNORA_BASE_URL", "http://localhost:8080"),
        help="WeKnora 服务地址",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("WEKNORA_TOKEN"),
        help="JWT access token（扫码登录后从浏览器复制，24h 内有效）",
    )
    parser.add_argument(
        "--admin-email",
        default=os.environ.get("WEKNORA_ADMIN_EMAIL"),
        help="超管邮箱",
    )
    parser.add_argument(
        "--admin-password",
        default=os.environ.get("WEKNORA_ADMIN_PASSWORD"),
        help="超管密码",
    )
    parser.add_argument(
        "--target-name",
        required=True,
        help="目标用户的名字",
    )
    args = parser.parse_args()

    args.base_url = args.base_url.rstrip("/")
    target_name = args.target_name.strip().lower()

    token = get_token(args)
    headers = auth_headers(token)

    # 先展示当前用户自己的信息
    print("[*] 当前认证用户信息：")
    me = get_my_info(args.base_url, headers)
    my_user = me.get("user", {})
    my_tenant = me.get("tenant", {})
    print(f"    用户名    : {my_user.get('username', 'N/A')}")
    print(f"    邮箱      : {my_user.get('email', 'N/A')}")
    print(f"    角色      : {my_user.get('role', 'N/A')}")
    print(f"    可跨租户  : {my_user.get('can_access_all_tenants', False)}")
    print(f"    我的租户  : {my_tenant.get('name', 'N/A')} (ID: {my_tenant.get('id', 'N/A')})")
    print()

    # 搜索目标用户的租户
    email_prefix = target_name.split("@")[0]
    print(f"[*] 搜索租户 (keyword={email_prefix})...")
    items = search_tenants(args.base_url, headers, email_prefix)

    if not items:
        print(f"[*] 无结果，尝试用完整邮箱搜索 (keyword={target_name})...")
        items = search_tenants(args.base_url, headers, target_name)

    if not items:
        print("[*] 仍无结果，尝试列出所有租户...")
        items = list_all_tenants(args.base_url, headers)

    if not items:
        sys.exit("未找到匹配的租户")

    # 输出结果
    print(f"\n找到 {len(items)} 个租户：")
    print("-" * 60)

    for item in items:
        tenant_id = item.get("id")
        tenant_name = item.get("name", "")
        tenant = get_tenant(args.base_url, headers, tenant_id)
        print(f"  租户 ID   : {tenant_id}")
        print(f"  租户名称  : {tenant_name}")
        print(f"  API Key   : {tenant.get('api_key', '')}")
        print("-" * 60)


if __name__ == "__main__":
    main()