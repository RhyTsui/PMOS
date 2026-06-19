"""
Scrapling HTTP Sidecar Server

为 GI 提供 Scrapling 采集能力的 HTTP 接口
"""
import json
import asyncio
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Scrapling imports
try:
    from scrapling import Fetcher, StealthyFetcher, DynamicFetcher
    from scrapling.parser import Selector
    SCRAPLING_AVAILABLE = True
except ImportError:
    SCRAPLING_AVAILABLE = False
    print("⚠️ Scrapling 未安装，请运行: pip install scrapling[fetchers]")


# ===== 数据模型 =====

class CrawlRequest(BaseModel):
    urls: List[str]
    method: str = "fetcher"  # fetcher | stealthy | dynamic
    css_selectors: Optional[Dict[str, str]] = None
    extract_images: bool = True
    ocr: bool = False
    timeout: int = 30000
    impersonate: Optional[str] = None  # 如 'chrome-131'
    headless: bool = True
    solve_cloudflare: bool = False
    adaptive: bool = False  # 自适应选择器

class CrawlResult(BaseModel):
    url: str
    title: str = ""
    content: str = ""
    content_html: str = ""
    summary: str = ""
    images: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    scrapling_available: bool


# ===== 指纹存储（自适应选择器用）=====
# 生产环境应该持久化到数据库
element_fingerprints: Dict[str, Dict] = {}


# ===== FastAPI 应用 =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🕷️ Scrapling Sidecar 启动")
    if not SCRAPLING_AVAILABLE:
        print("⚠️ Scrapling 未安装！")
    yield
    print("🕷️ Scrapling Sidecar 关闭")

app = FastAPI(
    title="Scrapling Sidecar for GI",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if SCRAPLING_AVAILABLE else "degraded",
        scrapling_available=SCRAPLING_AVAILABLE,
    )


@app.post("/crawl")
async def crawl(request: CrawlRequest) -> Dict[str, Any]:
    """
    批量采集页面
    """
    if not SCRAPLING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Scrapling 未安装")

    results = []
    for url in request.urls:
        try:
            result = await crawl_single(url, request)
            results.append(result.model_dump())
        except Exception as e:
            results.append(CrawlResult(
                url=url,
                error=str(e),
            ).model_dump())

    return {"results": results}


async def crawl_single(url: str, request: CrawlRequest) -> CrawlResult:
    """
    采集单个页面
    """
    # 根据 method 选择 fetcher
    if request.method == "stealthy":
        page = await asyncio.to_thread(
            StealthyFetcher.fetch,
            url,
            headless=request.headless,
            network_idle=True,
        )
    elif request.method == "dynamic":
        page = await asyncio.to_thread(
            DynamicFetcher.fetch,
            url,
            headless=request.headless,
            network_idle=True,
        )
    else:
        # 默认使用 Fetcher（最快）
        fetch_kwargs = {"timeout": request.timeout // 1000}
        if request.impersonate:
            fetch_kwargs["impersonate"] = request.impersonate

        page = await asyncio.to_thread(
            Fetcher.get,
            url,
            **fetch_kwargs,
        )

    # 提取内容
    title = ""
    content = ""
    content_html = ""
    images = []

    try:
        # 标题 - Scrapling 的 css() 返回 SelectorList，用 .get() 或 [0] 取第一个
        title_el = page.css("title")
        if title_el:
            first = title_el[0] if len(title_el) > 0 else None
            if first:
                # ::text 伪元素或直接取 text 属性
                try:
                    title = first.css("::text").getall()
                    title = " ".join(title).strip() if title else str(first).replace("<title>", "").replace("</title>", "").strip()
                except Exception:
                    title = str(first).replace("<title>", "").replace("</title>", "").strip()
    except Exception:
        pass

    try:
        # 正文 - 尝试多种选择器
        content_selectors = []
        if request.css_selectors and request.css_selectors.get("content"):
            content_selectors.append(request.css_selectors["content"])
        content_selectors.extend([
            "article",
            ".article-content",
            ".post-content",
            ".entry-content",
            ".content",
            "main",
        ])

        for selector in content_selectors:
            if not selector:
                continue
            try:
                elements = page.css(selector, adaptive=request.adaptive)
                if elements and len(elements) > 0:
                    el = elements[0]
                    # 提取纯文本（递归获取所有文本节点）
                    try:
                        text_parts = el.css("::text").getall()
                        text = " ".join(t.strip() for t in text_parts if t.strip())
                    except Exception:
                        text = el.text if hasattr(el, 'text') and el.text else ""

                    # 提取 HTML
                    try:
                        html = el.html if hasattr(el, 'html') else str(el)
                    except Exception:
                        html = str(el)

                    if text and len(text) > 100:
                        content = text
                        content_html = html
                        break
            except Exception:
                continue

        # 兜底：用 body 的文本
        if not content:
            try:
                body = page.css("body")
                if body and len(body) > 0:
                    import re
                    html_str = str(body[0])
                    # 移除 script 和 style
                    html_str = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html_str)
                    html_str = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html_str)
                    text = re.sub(r'<[^>]+>', ' ', html_str)
                    text = re.sub(r'\s+', ' ', text).strip()
                    content = text
                    content_html = html_str
            except Exception:
                pass
    except Exception:
        pass

    # 提取图片
    if request.extract_images:
        try:
            imgs = page.css("img")
            if imgs:
                for i, img in enumerate(imgs):
                    try:
                        src = img.attrib.get("src", "")
                        alt = img.attrib.get("alt", "")
                        if src and src.startswith("http"):
                            images.append({
                                "url": src,
                                "alt": alt,
                                "position": len(images) + 1,
                                "processed": False,
                            })
                    except Exception:
                        continue
        except Exception:
            pass

    # 清理内容
    content = clean_content(content)
    summary = content[:200] if content else ""

    return CrawlResult(
        url=url,
        title=title.strip(),
        content=content,
        content_html=content_html,
        summary=summary,
        images=images,
        metadata={
            "collector_type": f"scrapling_{request.method}",
            "method": request.method,
            "impersonate": request.impersonate,
        },
    )


@app.post("/stealthy-crawl")
async def stealthy_crawl(request: CrawlRequest) -> Dict[str, Any]:
    """
    隐身模式采集（绕过反爬）
    """
    request.method = "stealthy"
    request.solve_cloudflare = True
    return await crawl(request)


@app.post("/parse")
async def parse_html(html: str, css_selector: str) -> Dict[str, Any]:
    """
    解析 HTML 内容（不需要网络请求）
    """
    if not SCRAPLING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Scrapling 未安装")

    try:
        selector = Selector(html)
        elements = selector.css(css_selector)
        return {
            "count": len(elements.getall()),
            "texts": [el.text for el in elements.getall() if hasattr(el, 'text')],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/test-anti-bot")
async def test_anti_bot(url: str = "https://www.gamelook.com.cn"):
    """
    测试反爬绕过能力
    """
    if not SCRAPLING_AVAILABLE:
        return {"error": "Scrapling 未安装"}

    try:
        # 尝试用 StealthyFetcher 绕过反爬
        page = await asyncio.to_thread(
            StealthyFetcher.fetch,
            url,
            headless=True,
            network_idle=True,
            solve_cloudflare=True,
        )
        title = ""
        try:
            title_el = page.css("title")
            if title_el:
                title = str(title_el.getall()[0])
        except Exception:
            pass

        return {
            "success": True,
            "url": url,
            "title": title,
            "content_length": len(str(page)),
            "method": "stealthy",
        }
    except Exception as e:
        return {
            "success": False,
            "url": url,
            "error": str(e),
        }


def clean_content(content: str) -> str:
    """清洗文本内容"""
    import re
    # 去除噪音
    noise_patterns = [
        r'阅读全文\s*>>',
        r'点击阅读原文',
        r'扫码关注',
        r'长按识别二维码',
        r'点击.*?关注',
        r'商务合作',
    ]
    for pattern in noise_patterns:
        content = re.sub(pattern, '', content)

    # 去除多余空白
    content = re.sub(r'\n{3,}', '\n\n', content)
    content = re.sub(r'[ \t]+', ' ', content)

    return content.strip()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8888)
