# -*- coding: utf-8 -*-
"""
广告联调自动化执行器 - 核心代码提取版
供接手方AI快速理解和重新实现

原项目: Ad_Agent_Stable_V6
版本: v6.0
"""

import json
import os
import sys
import time
import asyncio
import logging
import re
import subprocess
import base64
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path


# =============================================================================
# 配置与目录
# =============================================================================

PROJECT_ROOT = Path(__file__).resolve().parent
LOGS_STEPS_DIR = PROJECT_ROOT / "logs" / "steps"
LOGS_ERRORS_DIR = PROJECT_ROOT / "logs" / "errors"
LOGS_ARTIFACTS_DIR = PROJECT_ROOT / "logs" / "artifacts"

# 创建目录
for d in [LOGS_STEPS_DIR, LOGS_ERRORS_DIR, LOGS_ARTIFACTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# =============================================================================
# 截图工具
# =============================================================================

def capture_screenshot(prefix: str, side: str = "common") -> Optional[str]:
    """通用截图函数 - 桌面截图"""
    try:
        import pyautogui
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{side}_{prefix}_{timestamp}.png"
        filepath = LOGS_STEPS_DIR / filename
        screenshot = pyautogui.screenshot()
        screenshot.save(str(filepath))
        return str(filepath)
    except Exception as e:
        print(f"截图失败: {e}")
        return None


def capture_error_screenshot() -> Optional[str]:
    """错误黑匣子截图"""
    try:
        import pyautogui
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"crash_{timestamp}.png"
        filepath = LOGS_ERRORS_DIR / filename
        screenshot = pyautogui.screenshot()
        screenshot.save(str(filepath))
        return str(filepath)
    except Exception as e:
        print(f"错误截图失败: {e}")
        return None


# =============================================================================
# MiniMax 视觉识别
# =============================================================================

class MiniMaxVision:
    """MiniMax 视觉识别接口"""

    def __init__(self, api_key: str, base_url: str = "https://api.minimax.chat/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model_name = "MiniMax-VL-01"

    def find_element_center(self, image_path: str, target_keyword: str) -> Optional[Tuple[int, int]]:
        """
        在图片中查找包含关键词的元素，返回中心坐标

        Args:
            image_path: 截图文件路径
            target_keyword: 要查找的关键词

        Returns:
            (center_x, center_y) 或 None
        """
        try:
            import httpx

            with open(image_path, 'rb') as f:
                image_base64 = base64.b64encode(f.read()).decode('utf-8')

            prompt = f"""请在这张图片中找到包含"{target_keyword}"的元素。
如果找到，请返回该元素的边界框坐标，格式为: x1,y1,x2,y2
其中 x1,y1 是左上角坐标，x2,y2 是右下角坐标。
如果找不到，返回 NOT_FOUND"""

            payload = {
                "model": self.model_name,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                    ]
                }],
                "max_tokens": 256
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = httpx.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )

            if response.status_code == 401:
                raise Exception("MiniMax API Key 无效或已过期")

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']

                # 解析坐标: x1,y1,x2,y2
                match = re.search(r'(\d+),(\d+),(\d+),(\d+)', content)
                if match:
                    x1, y1, x2, y2 = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4))
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    return (center_x, center_y)

            return None

        except Exception as e:
            print(f"MiniMax 视觉识别失败: {e}")
            return None

    def detect_keyword_on_screen(self, image_path: str, keyword: str) -> bool:
        """
        检测屏幕上是否存在包含关键词的元素

        Returns:
            True 存在, False 不存在
        """
        try:
            import httpx

            with open(image_path, 'rb') as f:
                image_base64 = base64.b64encode(f.read()).decode('utf-8')

            prompt = f"""请仔细检查这张图片中是否包含"{keyword}"字样的内容。
如果存在，请返回 FOUND
如果不存在，请返回 NOT_FOUND"""

            payload = {
                "model": self.model_name,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                    ]
                }],
                "max_tokens": 64
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = httpx.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30.0
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                return "FOUND" in content.upper()

            return False

        except Exception as e:
            print(f"MiniMax 关键词检测失败: {e}")
            return False


# =============================================================================
# ADB 工具
# =============================================================================

class ADBTools:
    """ADB 工具类 - 手机控制"""

    def __init__(self, device_id: str = None, adb_path: str = "adb"):
        self.device_id = device_id
        self.adb_path = adb_path

    def _run_adb(self, command: List[str]) -> str:
        """执行 ADB 命令"""
        try:
            cmd = [self.adb_path]
            if self.device_id:
                cmd.extend(['-s', self.device_id])
            cmd.extend(command)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            return result.stdout + result.stderr
        except Exception as e:
            print(f"ADB 命令执行失败: {e}")
            return ""

    def tap(self, x: int, y: int) -> bool:
        """点击坐标"""
        self._run_adb(['shell', 'input', 'tap', str(x), str(y)])
        return True

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 300) -> bool:
        """滑动"""
        self._run_adb(['shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(duration)])
        return True

    def screenshot(self, save_path: str) -> bool:
        """截图并保存到本地"""
        phone_path = '/sdcard/screenshot_temp.png'
        self._run_adb(['shell', 'screencap', '-p', phone_path])
        self._run_adb(['pull', phone_path, save_path])
        self._run_adb(['shell', 'rm', phone_path])
        return os.path.exists(save_path)

    def push_file(self, local_path: str, remote_path: str) -> bool:
        """推送文件到手机"""
        result = self._run_adb(['push', local_path, remote_path])
        return "pushed" in result.lower() or result == ""

    def refresh_media_library(self, file_path: str) -> bool:
        """刷新媒体库"""
        self._run_adb([
            'shell', 'am', 'broadcast',
            '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
            '-d', f'file://{file_path}'
        ])
        return True

    def start_activity(self, package: str, activity: str) -> bool:
        """启动 Activity"""
        self._run_adb(['shell', 'am', 'start', '-n', f'{package}/{activity}'])
        return True


# =============================================================================
# Web 端 SOP 执行器
# =============================================================================

class WebSOPExecutor:
    """Web 端 SOP 执行器 - 使用 Playwright"""

    def __init__(self, config: Dict[str, Any], vision: MiniMaxVision, adb: ADBTools):
        self.config = config
        self.vision = vision
        self.adb = adb
        self.browser = None
        self.context = None
        self.page = None
        self.asset_page = None

        # 账号配置
        self.username = config.get('web_config', {}).get('username')
        self.password = config.get('web_config', {}).get('password')

        # 事件资产页面 URL (需要根据实际情况配置)
        self.event_asset_url = "https://ad.oceanengine.com/oceanus/event_manager/own/android-app/1832707150550091/overview?aadvid=1812330415881259"

    async def initialize(self):
        """初始化 Playwright"""
        from playwright.async_api import async_playwright

        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=False, slow_mo=500)
        self.context = await self.browser.new_context(viewport={'width': 1920, 'height': 1080})
        self.page = await self.context.new_page()
        return True

    async def close(self):
        """关闭浏览器"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()

    async def step_login(self) -> bool:
        """步骤1: 登录"""
        print("[Web Step 1] 开始登录...")

        # 导航到登录页
        await self.page.goto("https://business.oceanengine.com/login", wait_until='networkidle')
        await self.page.wait_for_timeout(2000)

        # 填写账号密码
        await self.page.fill('input[type="text"]', self.username)
        await self.page.fill('input[type="password"]', self.password)

        # 协议勾选 - Playwright优先
        checkbox_clicked = False
        try:
            checkbox = await self.page.wait_for_selector(
                'span:has-text("我已阅读并同意") >> xpath=preceding::span[1]',
                timeout=3000
            )
            if checkbox:
                await checkbox.click()
                checkbox_clicked = True
        except:
            pass

        # 视觉兜底 - 向左偏移25像素
        if not checkbox_clicked:
            temp_screenshot = str(LOGS_STEPS_DIR / "temp_login_agreement.png")
            await self.page.screenshot(path=temp_screenshot)

            text_pos = self.vision.find_element_center(temp_screenshot, "我已阅读并同意")
            if text_pos:
                checkbox_x = text_pos[0] - 25
                checkbox_y = text_pos[1]
                await self.page.mouse.click(checkbox_x, checkbox_y)

        # 点击登录按钮
        await self.page.wait_for_timeout(500)
        await self.page.locator('button:has-text("登录")').click()

        # 等待跳转
        try:
            await self.page.wait_for_url("**/business.oceanengine.com/main/**", timeout=10000)
        except:
            pass

        await self.page.wait_for_timeout(3000)
        print("[Web Step 1] 登录完成")
        return True

    async def step_jump_to_event_page(self) -> bool:
        """步骤2: 跳转到事件资产页面"""
        print("[Web Step 2] 跳转到事件资产页面...")

        self.asset_page = await self.context.new_page()
        await self.asset_page.goto(self.event_asset_url, wait_until='networkidle')
        await self.asset_page.wait_for_timeout(3000)

        print("[Web Step 2] 跳转完成")
        return True

    async def handle_popup(self) -> bool:
        """步骤2.5: 处理弹窗（防御性）"""
        print("[Web Step 2.5] 处理弹窗...")

        try:
            text_element = self.asset_page.get_by_text("我已阅读并同意").first
            await text_element.wait_for(state="visible", timeout=10000)

            box = await text_element.bounding_box()
            if box:
                checkbox_x = box['x'] - 15
                checkbox_y = box['y'] + box['height'] / 2
                await self.asset_page.mouse.click(checkbox_x, checkbox_y)

            await self.asset_page.wait_for_timeout(500)

            enter_btn = self.asset_page.locator('button:has-text("进入事件管理")')
            await enter_btn.click()

        except:
            print("[Web Step 2.5] 未检测到弹窗，跳过")

        return True

    async def step_click_debug_tool(self) -> bool:
        """步骤3: 点击联调工具"""
        print("[Web Step 3] 点击联调工具...")

        # 点击联调工具
        await self.asset_page.locator('text="联调工具"').first.click()
        await self.asset_page.wait_for_timeout(2000)

        # 点击开始联调
        await self.asset_page.click('button:has-text("开始联调")')
        await self.asset_page.wait_for_timeout(2000)

        # 点击下一步
        await self.asset_page.click('button:has-text("下一步")')
        await self.asset_page.wait_for_timeout(2000)

        print("[Web Step 3] 联调工具点击完成")
        return True

    async def step_select_download_link(self) -> bool:
        """步骤4: 选择分包链接"""
        print("[Web Step 4] 选择分包链接...")

        # 点击分包链接
        fenbao_btn = self.asset_page.get_by_text("分包链接", exact=True)
        await fenbao_btn.wait_for(state="visible", timeout=10000)
        await fenbao_btn.click()
        await self.asset_page.wait_for_timeout(1000)

        # 点击选择下载链接
        await self.asset_page.locator('text="选择下载链接"').first.click()
        await self.asset_page.wait_for_timeout(1000)

        # 选择目标渠道号（示例）
        target_channel = "311348_20252020"
        try:
            await self.asset_page.locator('tr').filter(has_text=target_channel).locator('text="选择"').first.click(timeout=5000)
        except:
            await self.asset_page.locator(f'text="{target_channel}"').locator('xpath=following::*[text()="选择"][1]').click()

        await self.asset_page.wait_for_timeout(1500)

        # 选择监测链接组
        await self.asset_page.get_by_placeholder("请选择监测链接组").click(timeout=3000, force=True)
        await self.asset_page.wait_for_timeout(1500)

        target_item = self.asset_page.locator('text=JTYD-20_02').last
        await target_item.wait_for(state="visible", timeout=5000)
        await target_item.click(force=True)
        await self.asset_page.wait_for_timeout(1000)

        # 点击下一步
        await self.asset_page.locator('button:has-text("下一步")').first.click(force=True)
        await self.asset_page.wait_for_timeout(1000)

        print("[Web Step 4] 分包链接选择完成")
        return True

    async def step_generate_qr_code(self) -> bool:
        """步骤5: 抓取二维码"""
        print("[Web Step 5] 抓取二维码...")

        qr_path = str(LOGS_ARTIFACTS_DIR / "qr_code_latest.png")

        try:
            qr_locator = self.asset_page.locator('canvas, img[src*="qr"], .qr-code img').first
            await qr_locator.wait_for(state="visible", timeout=5000)
            await qr_locator.screenshot(path=qr_path)
        except:
            # 兜底：全屏截图
            await self.asset_page.screenshot(path=qr_path, full_page=True)

        print(f"[Web Step 5] 二维码已保存: {qr_path}")
        return True

    async def step_push_qr_to_phone(self) -> bool:
        """步骤6: 推送二维码到手机"""
        print("[Web Step 6] 推送二维码到手机...")

        qr_path = str(LOGS_ARTIFACTS_DIR / "qr_code_latest.png")
        remote_path = "/sdcard/Pictures/qr_code_latest.png"

        self.adb.push_file(qr_path, remote_path)
        self.adb.refresh_media_library(remote_path)

        print("[Web Step 6] 推送完成")
        return True

    async def execute_full_flow(self) -> bool:
        """执行完整Web端流程"""
        try:
            await self.initialize()
            await self.step_login()
            await self.step_jump_to_event_page()
            await self.handle_popup()
            await self.step_click_debug_tool()
            await self.step_select_download_link()
            await self.step_generate_qr_code()
            await self.step_push_qr_to_phone()
            return True
        except Exception as e:
            print(f"Web端执行失败: {e}")
            capture_error_screenshot()
            raise
        finally:
            await self.close()


# =============================================================================
# Mobile 端 SOP 执行器
# =============================================================================

class MobileSOPExecutor:
    """Mobile 端 SOP 执行器 - 视觉驱动"""

    def __init__(self, config: Dict[str, Any], vision: MiniMaxVision, adb: ADBTools):
        self.config = config
        self.vision = vision
        self.adb = adb

        # 关键词配置
        self.auth_keyword = config.get('ad_target', {}).get('mobile_auth_keyword', '授权测试')
        self.feed_keyword = config.get('ad_target', {}).get('mobile_feed_keyword', '转化联调')
        self.action_keyword = config.get('ad_target', {}).get('mobile_action_keyword', '打开')

    async def step_scan_qr_code(self) -> bool:
        """步骤1: 扫码"""
        print("[Mobile Step 1] 开始扫码...")

        # 启动抖音（实际Activity需要根据抖音版本调整）
        self.adb.start_activity("com.ss.android.ugc.aweme", "com.ss.android.ugc.aweme.main.MainActivity")
        await asyncio.sleep(3)

        # 截图并查找相册按钮
        temp_screenshot = str(LOGS_STEPS_DIR / "temp_mobile_scan.png")
        self.adb.screenshot(temp_screenshot)

        album_pos = self.vision.find_element_center(temp_screenshot, "相册")
        if album_pos:
            self.adb.tap(album_pos[0], album_pos[1])
        else:
            # 默认位置
            self.adb.tap(540, 1800)

        await asyncio.sleep(2)

        # 点击第一张图片（最新的二维码）
        self.adb.tap(300, 400)
        await asyncio.sleep(2)

        print("[Mobile Step 1] 扫码完成")
        return True

    async def step_click_auth(self) -> bool:
        """步骤2: 点击授权测试"""
        print("[Mobile Step 2] 点击授权测试...")

        temp_screenshot = str(LOGS_STEPS_DIR / "temp_mobile_auth.png")
        self.adb.screenshot(temp_screenshot)

        auth_pos = self.vision.find_element_center(temp_screenshot, self.auth_keyword)
        if auth_pos:
            self.adb.tap(auth_pos[0], auth_pos[1])
        else:
            self.adb.tap(540, 960)

        await asyncio.sleep(2)
        print("[Mobile Step 2] 授权测试完成")
        return True

    async def step_swipe_and_find_ad(self) -> bool:
        """步骤3: 刷视频找广告（最多8次滑动）"""
        print("[Mobile Step 3] 开始刷视频找广告...")

        max_swipes = 8

        for i in range(max_swipes):
            print(f"[Mobile Step 3] 第 {i+1}/{max_swipes} 次滑动...")

            temp_screenshot = str(LOGS_STEPS_DIR / f"temp_mobile_swipe_{i}.png")
            self.adb.screenshot(temp_screenshot)

            # 视觉检测关键词
            found = self.vision.detect_keyword_on_screen(temp_screenshot, self.feed_keyword)

            if found:
                print(f"[Mobile Step 3] 找到广告标识: {self.feed_keyword}")
                return True

            # 未找到，执行滑动（向上滑动）
            self.adb.swipe(540, 1500, 540, 700, 300)
            await asyncio.sleep(2)

        print(f"[Mobile Step 3] 滑动 {max_swipes} 次后未找到广告")
        return False

    async def step_click_ad_and_launch(self) -> bool:
        """步骤4: 点击广告启动游戏"""
        print("[Mobile Step 4] 点击广告启动游戏...")

        temp_screenshot = str(LOGS_STEPS_DIR / "temp_mobile_ad.png")
        self.adb.screenshot(temp_screenshot)

        # 点击广告
        ad_pos = self.vision.find_element_center(temp_screenshot, self.feed_keyword)
        if ad_pos:
            self.adb.tap(ad_pos[0], ad_pos[1])
        else:
            self.adb.tap(540, 960)

        await asyncio.sleep(3)

        # 点击"打开"按钮
        temp_screenshot2 = str(LOGS_STEPS_DIR / "temp_mobile_action.png")
        self.adb.screenshot(temp_screenshot2)

        action_pos = self.vision.find_element_center(temp_screenshot2, self.action_keyword)
        if action_pos:
            self.adb.tap(action_pos[0], action_pos[1])
        else:
            self.adb.tap(540, 1850)

        await asyncio.sleep(5)
        print("[Mobile Step 4] 游戏启动完成")
        return True

    async def execute_full_flow(self) -> bool:
        """执行完整Mobile端流程"""
        try:
            await self.step_scan_qr_code()
            await self.step_click_auth()

            if not await self.step_swipe_and_find_ad():
                return False

            await self.step_click_ad_and_launch()
            return True
        except Exception as e:
            print(f"Mobile端执行失败: {e}")
            capture_error_screenshot()
            raise


# =============================================================================
# 轮询等待
# =============================================================================

class SuccessPoller:
    """轮询等待联调成功"""

    def __init__(self, vision: MiniMaxVision, interval: int = 30):
        self.vision = vision
        self.interval = interval

    async def poll_until_success(self, max_attempts: int = 20) -> bool:
        """轮询直到检测到联调成功"""
        print(f"开始轮询等待联调成功 (间隔 {self.interval} 秒)...")

        for attempt in range(max_attempts):
            print(f"轮询尝试 {attempt + 1}/{max_attempts}...")

            temp_screenshot = str(LOGS_STEPS_DIR / f"temp_poll_{attempt}.png")
            capture_screenshot(f"poll_{attempt}")

            found = self.vision.detect_keyword_on_screen(temp_screenshot, "联调成功")

            if found:
                print("检测到联调成功!")
                return True

            if attempt < max_attempts - 1:
                await asyncio.sleep(self.interval)

        print(f"轮询 {max_attempts} 次后未检测到联调成功")
        return False


# =============================================================================
# 主执行器
# =============================================================================

class HybridDebugExecutor:
    """混合动力联调执行器"""

    def __init__(self, config_path: str):
        self.config_path = config_path

        # 加载配置
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)

        # 初始化组件
        self.vision = MiniMaxVision(
            api_key=self.config.get('ai_model', {}).get('api_key'),
            base_url=self.config.get('ai_model', {}).get('base_url', 'https://api.minimax.chat/v1')
        )

        self.adb = ADBTools(
            device_id=self.config.get('mobile_env', {}).get('device_id'),
            adb_path=self.config.get('mobile_env', {}).get('adb_path', 'adb')
        )

        self.web_executor = WebSOPExecutor(self.config, self.vision, self.adb)
        self.mobile_executor = MobileSOPExecutor(self.config, self.vision, self.adb)
        self.poller = SuccessPoller(self.vision, interval=30)

    async def run(self):
        """执行完整流程"""
        print("=" * 60)
        print("广告联调自动化执行器 v6.0")
        print("=" * 60)

        try:
            # Phase 1: Web端
            print("\n[Phase 1] 执行 Web 端 SOP...")
            await self.web_executor.execute_full_flow()

            # Phase 2: Mobile端
            print("\n[Phase 2] 执行 Mobile 端 SOP...")
            await self.mobile_executor.execute_full_flow()

            # Phase 3: 轮询
            print("\n[Phase 3] 轮询等待联调成功...")
            await self.poller.poll_until_success(max_attempts=20)

            print("\n" + "=" * 60)
            print("执行完成")
            print("=" * 60)

            return True

        except Exception as e:
            print(f"执行异常: {e}")
            capture_error_screenshot()
            raise


# =============================================================================
# 主入口
# =============================================================================

def main():
    config_path = str(PROJECT_ROOT / "configs" / "env_secrets.json")

    try:
        executor = HybridDebugExecutor(config_path)
        asyncio.run(executor.run())
    except Exception as e:
        print(f"严重错误: {e}")
        import traceback
        traceback.print_exc()
        capture_error_screenshot()
        sys.exit(1)


if __name__ == "__main__":
    main()
