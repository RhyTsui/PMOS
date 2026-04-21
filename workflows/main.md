# Main Workflow

## PMAIOS v0.6 workflow 鐩爣

- 闈㈠悜 PMAIOS 闂幆鍙戝竷绯荤粺鍗囩骇锛岃€屼笉鏄仠鐣欏湪 workflow demo
- 淇濇寔鏂囦欢鐪熸簮椹卞姩锛歚docs/`銆乣workflows/`銆乣prompts/`銆乣config/` 涓哄畾涔夊眰
- 鏈疆鑱氱劍 `Execution + Requirement + Version + Observability + Governance` 浜斾釜闂幆
- 澶栭儴鍩虹璁炬柦鏈疆鍙繚鐣欐帴鍏ヨ竟鐣岋紝涓嶅仛鍏ㄩ噺杩佺Щ

## Stages

1. 鏍稿績瀹氫箟鍩虹嚎
2. Schema 涓庡绾﹀崌绾?3. Orchestrator 鍐呮牳璋冨害
4. Stage Execution / Capability 鎻掓Ы
5. Memory / Context / Trace
6. API / CLI / Frontend 鎿嶄綔闈?7. Review / Metrics / Telemetry
8. 娴嬭瘯鍥炲綊涓庡崌绾ч獙鏀?
## Required outputs per stage

- 鏍稿績瀹氫箟鍩虹嚎 鈫?`docs/implementation/*.md`銆乣docs/tasks/*.md`
- Schema 涓庡绾﹀崌绾?鈫?`src/shared/*.ts`銆乣src/core/*.ts`
- Orchestrator 鍐呮牳璋冨害 鈫?`src/core/*.ts`
- Stage Execution / Capability 鎻掓Ы 鈫?`src/core/*.ts`銆乣src/llm_router/*.ts`
- Memory / Context / Trace 鈫?`src/core/*.ts`銆乣docs/memory/*`
- API / CLI / Frontend 鎿嶄綔闈?鈫?`src/backend/*`銆乣src/cli/*`銆乣src/frontend/*`
- Review / Metrics / Telemetry 鈫?`src/core/*.ts`銆乣docs/review/*.md`
- 娴嬭瘯鍥炲綊涓庡崌绾ч獙鏀?鈫?`tests/unit/*`銆乣tests/integration/*`

## Structured schema mapping

- 宸ヤ綔娴佺湡婧愮敱 `workflows/*.md` 涓?`docs/tasks/PMAIOS_v0.6_鍗囩骇浠诲姟娓呭崟.md` 鍏卞悓瀹氫箟
- `src/core/workflowEngine.ts` 璐熻矗鎶婄湡婧愯浆鎹负缁熶竴 typed schema
- API銆丆LI銆佸墠绔繀椤绘秷璐瑰悓涓€濂楄繍琛屾ā鍨嬶紝涓嶅湪鍚勮嚜渚ч噸澶嶅畾涔夋祦绋嬭涔?- `subprojects/` 浠呬綔涓?PMAIOS 鑳藉姏娑堣垂鑰咃紝涓嶅弬涓庨《灞傚钩鍙板熀绾垮畾涔?
