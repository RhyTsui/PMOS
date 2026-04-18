# 报表接口示例

其中 Authorization 字段是token 目前用的是许晴账号登录token，超3小时会失效。后续可以登录预发布环境后开f12 复制一个curl\_bash 获取token

广告小时报表

    curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/15' \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVfdGltZSI6MTc3NTY0NzA0MTg1NiwidXNlcl9pZCI6MjAyNTczOSwicGhvbmUiOiI4NjE1NjE4OTQ2MjYxIiwidXNlcl9uYW1lIjoieHVxaW5nMDMiLCJyZWFsX25hbWUiOiLorrjmmbQiLCJzZXNzaW9uSWQiOiI0NjJkYmM3ZTk4YjEzYTY1NGIyNjA2ZTc3YzFlYzkwMSIsImFwcF9pZCI6OTAwMDEsInRoaXJkX2FjY291bnQiOiJkb2Jlc3QuY29tXFx4dXFpbmcwMyJ9.3-FO-H31I-_p7osbna3AM5HtrXHiD8k8J0BSYLuDg5U' \
      -H 'Cache-Control: no-cache' \
      -H 'Connection: keep-alive' \
      -H 'Content-Type: application/json;charset=UTF-8' \
      -b '_YKTrack_device_id=13526387-b6d7c2c4-d38a270f91a11f45' \
      -H 'Origin: https://pre-aitd.dobest.cn' \
      -H 'Pragma: no-cache' \
      -H 'Referer: https://pre-aitd.dobest.cn/' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Site: same-origin' \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
      -H 'X-App-Id: 10100042' \
      -H 'X-Request-Tag: PageModuleTableRender_15_undefined' \
      -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
      -H 'sec-ch-ua-mobile: ?0' \
      -H 'sec-ch-ua-platform: "Windows"' \
      -H 'traceparent: 00-792c624f419f09d1b11aa285d49ec512-874a4ad893503157-01' \
      --data-raw '{"filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE","base_time_type":"REGISTER_TIME","promotion_source":"AD"},"start":"2026-04-08","end":"2026-04-08","timeType":"HOURLY","routeKey":"page-15_15"}'

广告日报

    curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/5' \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVfdGltZSI6MTc3NTY0NzA0MTg1NiwidXNlcl9pZCI6MjAyNTczOSwicGhvbmUiOiI4NjE1NjE4OTQ2MjYxIiwidXNlcl9uYW1lIjoieHVxaW5nMDMiLCJyZWFsX25hbWUiOiLorrjmmbQiLCJzZXNzaW9uSWQiOiI0NjJkYmM3ZTk4YjEzYTY1NGIyNjA2ZTc3YzFlYzkwMSIsImFwcF9pZCI6OTAwMDEsInRoaXJkX2FjY291bnQiOiJkb2Jlc3QuY29tXFx4dXFpbmcwMyJ9.3-FO-H31I-_p7osbna3AM5HtrXHiD8k8J0BSYLuDg5U' \
      -H 'Cache-Control: no-cache' \
      -H 'Connection: keep-alive' \
      -H 'Content-Type: application/json;charset=UTF-8' \
      -b '_YKTrack_device_id=13526387-b6d7c2c4-d38a270f91a11f45' \
      -H 'Origin: https://pre-aitd.dobest.cn' \
      -H 'Pragma: no-cache' \
      -H 'Referer: https://pre-aitd.dobest.cn/' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Site: same-origin' \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
      -H 'X-App-Id: 10100042' \
      -H 'X-Request-Tag: PageModuleTableRender_5_undefined' \
      -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
      -H 'sec-ch-ua-mobile: ?0' \
      -H 'sec-ch-ua-platform: "Windows"' \
      -H 'traceparent: 00-0afdac012864f66bf9cfbd2bf0f8ad9a-d6e1e8201fd7c779-01' \
      --data-raw '{"isDevide":"0","filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE","promotion_source":"AD"},"start":"2026-03-26","end":"2026-04-08","timeType":"DAY","routeKey":"page-5_DAY_5"}'

广告roi报表

    curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/9' \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVfdGltZSI6MTc3NTY0NzA0MTg1NiwidXNlcl9pZCI6MjAyNTczOSwicGhvbmUiOiI4NjE1NjE4OTQ2MjYxIiwidXNlcl9uYW1lIjoieHVxaW5nMDMiLCJyZWFsX25hbWUiOiLorrjmmbQiLCJzZXNzaW9uSWQiOiI0NjJkYmM3ZTk4YjEzYTY1NGIyNjA2ZTc3YzFlYzkwMSIsImFwcF9pZCI6OTAwMDEsInRoaXJkX2FjY291bnQiOiJkb2Jlc3QuY29tXFx4dXFpbmcwMyJ9.3-FO-H31I-_p7osbna3AM5HtrXHiD8k8J0BSYLuDg5U' \
      -H 'Cache-Control: no-cache' \
      -H 'Connection: keep-alive' \
      -H 'Content-Type: application/json;charset=UTF-8' \
      -b '_YKTrack_device_id=13526387-b6d7c2c4-d38a270f91a11f45' \
      -H 'Origin: https://pre-aitd.dobest.cn' \
      -H 'Pragma: no-cache' \
      -H 'Referer: https://pre-aitd.dobest.cn/' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Site: same-origin' \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
      -H 'X-App-Id: 10100042' \
      -H 'X-Request-Tag: PageModuleTableRender_9_undefined' \
      -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
      -H 'sec-ch-ua-mobile: ?0' \
      -H 'sec-ch-ua-platform: "Windows"' \
      -H 'traceparent: 00-1b8674dfef3436f640b69f5d4dc46eab-155821042fa273b9-01' \
      --data-raw '{"isDevide":"0","filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE","promotion_source":"AD"},"start":"2026-03-26","end":"2026-04-08","timeType":"DAY","dataType":"total","routeKey":"page-9_DAY_9"}'

广告留存报表

    curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/10' \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVfdGltZSI6MTc3NTY0NzA0MTg1NiwidXNlcl9pZCI6MjAyNTczOSwicGhvbmUiOiI4NjE1NjE4OTQ2MjYxIiwidXNlcl9uYW1lIjoieHVxaW5nMDMiLCJyZWFsX25hbWUiOiLorrjmmbQiLCJzZXNzaW9uSWQiOiI0NjJkYmM3ZTk4YjEzYTY1NGIyNjA2ZTc3YzFlYzkwMSIsImFwcF9pZCI6OTAwMDEsInRoaXJkX2FjY291bnQiOiJkb2Jlc3QuY29tXFx4dXFpbmcwMyJ9.3-FO-H31I-_p7osbna3AM5HtrXHiD8k8J0BSYLuDg5U' \
      -H 'Cache-Control: no-cache' \
      -H 'Connection: keep-alive' \
      -H 'Content-Type: application/json;charset=UTF-8' \
      -b '_YKTrack_device_id=13526387-b6d7c2c4-d38a270f91a11f45' \
      -H 'Origin: https://pre-aitd.dobest.cn' \
      -H 'Pragma: no-cache' \
      -H 'Referer: https://pre-aitd.dobest.cn/' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Site: same-origin' \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
      -H 'X-App-Id: 10100042' \
      -H 'X-Request-Tag: PageModuleTableRender_10_undefined' \
      -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
      -H 'sec-ch-ua-mobile: ?0' \
      -H 'sec-ch-ua-platform: "Windows"' \
      -H 'traceparent: 00-019b11091ac24fa82752cbeed6bdc35f-25bb81d635bacc30-01' \
      --data-raw '{"filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE","retention_type":"DEVICE_RETENTION","promotion_source":"AD,MKT,OP"},"start":"2026-03-26","end":"2026-04-08","timeType":"DAY","routeKey":"page-10_10"}'

回流数据

    curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/42' \
      -H 'Accept: application/json, text/plain, */*' \
      -H 'Accept-Language: zh-CN,zh;q=0.9' \
      -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVfdGltZSI6MTc3NTY0NzA0MTg1NiwidXNlcl9pZCI6MjAyNTczOSwicGhvbmUiOiI4NjE1NjE4OTQ2MjYxIiwidXNlcl9uYW1lIjoieHVxaW5nMDMiLCJyZWFsX25hbWUiOiLorrjmmbQiLCJzZXNzaW9uSWQiOiI0NjJkYmM3ZTk4YjEzYTY1NGIyNjA2ZTc3YzFlYzkwMSIsImFwcF9pZCI6OTAwMDEsInRoaXJkX2FjY291bnQiOiJkb2Jlc3QuY29tXFx4dXFpbmcwMyJ9.3-FO-H31I-_p7osbna3AM5HtrXHiD8k8J0BSYLuDg5U' \
      -H 'Cache-Control: no-cache' \
      -H 'Connection: keep-alive' \
      -H 'Content-Type: application/json;charset=UTF-8' \
      -b '_YKTrack_device_id=13526387-b6d7c2c4-d38a270f91a11f45' \
      -H 'Origin: https://pre-aitd.dobest.cn' \
      -H 'Pragma: no-cache' \
      -H 'Referer: https://pre-aitd.dobest.cn/' \
      -H 'Sec-Fetch-Dest: empty' \
      -H 'Sec-Fetch-Mode: cors' \
      -H 'Sec-Fetch-Site: same-origin' \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
      -H 'X-App-Id: 10100042' \
      -H 'X-Request-Tag: PageModuleTableRender_42_undefined' \
      -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
      -H 'sec-ch-ua-mobile: ?0' \
      -H 'sec-ch-ua-platform: "Windows"' \
      -H 'traceparent: 00-e1952f8cae1aa2170b0df2da82032ab7-a15c191d4f06d876-01' \
      --data-raw '{"filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE"},"start":"2026-03-26","end":"2026-04-08","timeType":"DAY","routeKey":"page-42_42"}'