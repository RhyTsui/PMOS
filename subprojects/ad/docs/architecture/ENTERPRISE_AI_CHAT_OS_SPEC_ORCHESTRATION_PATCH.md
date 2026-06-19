# Enterprise AI Chat OS Orchestration Patch

Add the following concepts to `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`.

## 1. Request Understanding & Capability Orchestration System

The system must first convert user text into a structured requirement:

- task
- business domain
- requested view
- metrics
- dimensions
- filters
- date range
- granularity

This is the truth source for routing and capability selection.

## 2. Capability Discovery

All MCP tools must be normalized into capability manifests before selection.

Capability manifests must describe:

- supported metrics
- supported dimensions
- supported granularity
- supported views
- source tool
- provider
- authority

## 3. Selection Rules

- Do not select by fixed tool name.
- Do not treat `material` as a special system module.
- Select the capability with the best coverage of the requirement.
- If no capability fully covers the request, the system must disclose the fallback or ask for more input.

## 4. Result Assembly

Final business output must enter the unified semantic result plane.

## 5. Routing Trace

Every routing and fallback decision must be recorded for replay and governance.

## 6. Admin Governance

The admin center must expose request understanding rules, capability registry state, and routing trace visibility.
