# Providers

This project uses a provider abstraction layer so model vendors can be swapped without changing workflow logic.

## Principles

- Never hardcode API keys in source files
- Read provider credentials from environment variables
- Keep model providers separate from MCP tool providers
- Default to `mock` when no real credentials are configured

## Supported provider types

- `mock` — deterministic local placeholder for bootstrapping
- `anthropic` — Claude-compatible text generation provider
- `openai-compatible` — OpenAI-style HTTP API provider
- `ai-studio` — Google AI Studio provider for multimodal execution

## Google AI Studio integration

If a Google AI Studio key is provided, configure it through environment variables instead of committing the secret:

- `GOOGLE_AI_STUDIO_API_KEY`

For temporary migration only, the runtime may still detect the legacy `AI_STUDIO_API_KEY` and surface a warning.

The runtime should treat AI Studio as a replaceable provider implementation behind the shared `ModelProvider` interface. Initial OS-level capabilities are:

- `text-multimodal`
- `image-generation`
- `video-generation`
- `prototype-generation`

## OpenSpec / Superpowers policy

OpenSpec and Superpowers are treated as external systems. This repository only reserves integration points for them and does not reimplement their behavior.
