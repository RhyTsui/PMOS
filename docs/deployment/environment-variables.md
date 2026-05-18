# PMOS Environment Variables

- version: v0.1
- date: 2026-05-09
- status: active

## Purpose

This document defines the public environment-variable surface for the standalone `PMOS product repo`.

Only variable names, default meanings, and setup guidance belong here.
Real values must stay in local `.env` files and must not be committed.

## Required for local bootstrapping

1. `PORT`
2. `AI_OS_ROOT`
3. `DEFAULT_PROVIDER`

## Optional provider credentials

1. `ANTHROPIC_API_KEY`
2. `GOOGLE_AI_STUDIO_API_KEY`
3. `OPENAI_COMPATIBLE_API_KEY`
4. `OPENAI_COMPATIBLE_BASE_URL`
5. `OPENAI_COMPATIBLE_MODEL`

## Optional knowledge and connector credentials

1. `NOTION_API_KEY`
2. `NOTION_PAGE_ID`
3. `NOTION_DATABASE_ID`
4. `FIGMA_API_KEY`
5. `WEB_FETCH_USER_AGENT`

## Optional local automation variables

1. `DINGTALK_MEETING_IMPORT_MODE`
2. `DINGTALK_EXE_PATH`
3. `DINGTALK_EXPORT_ROOT`

## Release rules

1. Commit `.env.example`, not `.env`
2. Commit `config/providers.example.json`, not private provider configs
3. Never commit real API keys, cookies, tokens, or machine-specific paths
4. Public docs must use example values or blank placeholders only
