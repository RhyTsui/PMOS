from __future__ import annotations

from json import JSONDecodeError
from typing import Any

import httpx

from app.bi.mappings import get_upstream_transport
from app.settings import AppSettings


class BIClientError(RuntimeError):
    pass


class BIAuthError(BIClientError):
    pass


class BIConfigError(BIClientError):
    pass


class BIClient:
    def __init__(self, settings: AppSettings):
        self.settings = settings

    async def call(self, operation_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.bi_base_url:
            raise BIConfigError("BI base URL is not configured")
        if not self.settings.bi_token:
            raise BIAuthError("BI token is missing or expired")

        transport = get_upstream_transport(operation_id)
        if transport.get("kind") != "bi_post":
            raise BIConfigError(f"{operation_id} does not use BI POST transport")

        path = transport.get("path")
        if not path:
            raise BIConfigError(f"endpoint path is not configured for {operation_id}")

        url = self.settings.bi_base_url.rstrip("/") + path
        return await self._request(
            transport.get("method", "POST"),
            url,
            json=payload,
        )

    async def call_http(self, transport: dict[str, Any], payload: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.settings.bi_base_url:
            raise BIConfigError("BI base URL is not configured")
        if not self.settings.bi_token:
            raise BIAuthError("BI token is missing or expired")

        path = transport.get("path")
        if not path:
            raise BIConfigError("endpoint path is not configured")

        url = self.settings.bi_base_url.rstrip("/") + str(path)
        method = str(transport.get("method") or "GET")
        query = transport.get("query")
        return await self._request(method, url, params=query, json=payload)

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": self.settings.bi_token,
            "x-debug-env": self.settings.bi_debug_env,
        }
        if self.settings.bi_app_id:
            headers["X-App-Id"] = str(self.settings.bi_app_id)

        try:
            async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
                response = await client.request(
                    method,
                    url,
                    headers=headers,
                    params=params,
                    json=json,
                )
        except httpx.TimeoutException as exc:
            raise BIClientError("BI request timed out") from exc
        except httpx.RequestError as exc:
            raise BIClientError(f"BI request failed: {exc}") from exc

        error_detail = _extract_error_detail(response)
        if response.status_code in {401, 403}:
            message = "BI token is invalid or expired"
            if error_detail:
                message = f"{message}: {error_detail}"
            raise BIAuthError(message)
        if response.is_error:
            message = f"BI request failed with status {response.status_code}"
            if error_detail:
                message = f"{message}: {error_detail}"
            raise BIClientError(message)

        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                return response.json()
            except (ValueError, JSONDecodeError) as exc:
                raise BIClientError("BI response declared JSON but could not be parsed") from exc
        return {"text": response.text}


def _extract_error_detail(response: httpx.Response) -> str | None:
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            payload = response.json()
        except (ValueError, JSONDecodeError):
            payload = None
        if isinstance(payload, dict):
            for key in ("message", "msg", "error", "reason", "detail"):
                value = payload.get(key)
                if value:
                    return _limit_error_text(str(value))
            return _limit_error_text(str(payload))
        if payload is not None:
            return _limit_error_text(str(payload))
    text = response.text.strip()
    if text:
        return _limit_error_text(text)
    return None


def _limit_error_text(text: str, limit: int = 240) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 3] + "..."
