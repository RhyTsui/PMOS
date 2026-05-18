from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from ad.app import app


class McpMonitorRouteTests(TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.auth_headers = {"Authorization": "Bearer local-mcp-token"}

    @patch("ad.api.routes.mcp.get_mcp_server_token", return_value="local-mcp-token")
    def test_initialize_returns_server_info_and_session(self, _token_mock) -> None:
        response = self.client.post(
            "/api/v1/mcp/aiad-monitor",
            headers=self.auth_headers,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {},
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["result"]["serverInfo"]["name"], "aiad-monitor-mcp")
        self.assertEqual(data["result"]["protocolVersion"], "2024-11-05")
        self.assertTrue(response.headers.get("Mcp-Session-Id"))

    @patch("ad.api.routes.mcp.get_mcp_server_token", return_value="local-mcp-token")
    def test_tools_list_returns_create_monitor_tool(self, _token_mock) -> None:
        response = self.client.post(
            "/api/v1/mcp/aiad-monitor",
            headers=self.auth_headers,
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {},
            },
        )

        self.assertEqual(response.status_code, 200)
        tools = response.json()["result"]["tools"]
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]["name"], "create_monitor_campaign")

    @patch("ad.api.routes.mcp.get_mcp_server_token", return_value="local-mcp-token")
    @patch("ad.api.routes.mcp.call_tool")
    def test_tools_call_delegates_to_service(self, call_tool_mock, _token_mock) -> None:
        call_tool_mock.return_value = {
            "content": [{"type": "text", "text": "{\"ok\": true}"}],
            "structuredContent": {"ok": True},
            "isError": False,
        }
        response = self.client.post(
            "/api/v1/mcp/aiad-monitor",
            headers=self.auth_headers,
            json={
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "create_monitor_campaign",
                    "arguments": {
                        "campaignName": "创建监测512",
                        "accountId": "1834597094640840",
                    },
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        result = response.json()["result"]
        self.assertFalse(result["isError"])
        call_tool_mock.assert_called_once()

    @patch("ad.api.routes.mcp.get_mcp_server_token", return_value="local-mcp-token")
    def test_missing_auth_is_rejected(self, _token_mock) -> None:
        response = self.client.post(
            "/api/v1/mcp/aiad-monitor",
            json={"jsonrpc": "2.0", "id": 4, "method": "initialize", "params": {}},
        )

        self.assertEqual(response.status_code, 401)
