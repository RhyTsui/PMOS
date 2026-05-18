# PMChat Ant Design X Capability Matrix

- status: active
- date: 2026-05-12
- scope: PMChat default chat shell, PMOS platform chat capability, governed subproject derivative chats

## Purpose

This document defines the governed capability and acceptance matrix for the default `PMChat` shell.

The target is:

- one benchmark chat
- built with `React + Ant Design X`
- using `Qwen` as the default model baseline
- using `X SDK` as the default chat dataflow baseline
- using `X Markdown` / `X Card` / `X Skill` as governed extension layers

This is not a generic workbench spec.

This is the truth document for building a benchmark chat that anchors the PMOS AI-native workspace shell and can later generate many governed derivative chats.

## Technical Baseline

### Frontend

- `React`
- `@ant-design/x`
- `antd`

### Default Chat Dataflow

- `useXChat`
- `useXConversations`
- `XRequest`
- `Request`
- `XStream`
- `Stream`

### Chat Service Providers

- `OpenAIChatProvider`
- `Qwen` model integration baseline

Interpretation:

- chat message state should default to `useXChat`
- conversation/session state should default to `useXConversations`
- transport/request wiring should default to `XRequest`
- low-level request/stream primitives should remain aligned with `Request / XStream / Stream`
- provider adapters should stay governed; `OpenAIChatProvider` is part of the accepted service-provider matrix
- do not invent a parallel custom chat dataflow unless a governed exception is documented

### Model Baseline

- default model integration baseline: `Qwen`

### Rendering / Extension Baseline

- `@ant-design/x-markdown`
- `@ant-design/x-card`
- `@ant-design/x-sdk`
- `@ant-design/x-skill`
- `A2UI v0.9`

### Dynamic UI Baseline

- `A2UI v0.9` should be treated as the governed dynamic UI layer
- agent output should be able to map into structured UI payloads instead of only plain text
- dynamic UI should stay inside the chat-first shell, not escape into dashboard-first layout

## RICH Design Matrix

### Intention

Must provide governed examples for:

- explicit intention types
- intention expectation examples
- guided intention expression examples
- plan and step decomposition examples

### Role

Must provide governed examples for:

- role identity
- role tone consistency
- role boundary
- role-to-intention matching

### Conversation

Must provide governed examples for:

- start
- follow-up
- prompt
- confirmation
- error
- end

### Hybrid UI

Must provide governed examples for:

- message-first result carrying
- folded evidence
- folded thinking
- typed result surfaces
- action strip below message
- source references

## Streaming Chat Matrix

Streaming chat is a core capability, not a decorative effect.

Must cover:

1. generating state
- streaming append
- tail indicator
- typewriter-like progression when applicable
- finish-state convergence

2. incomplete content carrying
- incomplete markdown
- incomplete link
- incomplete list
- incomplete table
- incomplete code block
- incomplete emphasis

3. animation
- fade-in block behavior
- animation duration
- easing

4. message-component linkage
- streaming markdown
- streaming code
- streaming thinking
- streaming sources
- streaming actions

5. interruption / failure
- stop
- retry
- partial result retain
- failed state surface

6. transport / provider linkage
- `OpenAIChatProvider`
- `XRequest`
- `Request`
- `XStream`
- `Stream`
- provider-to-message rendering consistency

## X Markdown Matrix

### Minimum Setup

- `content`
- `children`
- basic heading / paragraph / list / quote rendering

### Component Mapping

- `components`
- code block to `CodeHighlighter`
- chart block to `Mermaid`

### Streaming

- `streaming.hasNextChunk`
- `streaming.enableAnimation`
- `streaming.animationConfig`
- `streaming.tail`
- `streaming.incompleteMarkdownComponentMap`

### Parse / Config

- `markdownConfig`
- `paragraphTag`

### Security

- `openLinksInNewTab`
- `dompurifyConfig`
- `preserveCustomTagBreaks`
- `escapeRawHtml`

### Container / Debug

- `className`
- `rootClassName`
- `style`
- `prefixCls`
- `debug`

### Extension

- `Latex`
- `CustomPlugins`
- syntax extension examples

## Component Matrix

### Common

1. `Bubble`
- `Basic`
- `List`
- role variants
- loading / typing
- `Semantic DOM`
- `Design Token`

2. `Conversations`
- `Basic`
- active
- creation
- grouping if used
- empty / long title
- `Semantic DOM`
- `Design Token`

3. `Notification`
- `Basic`
- success / warning / error / info
- open / close
- `Semantic DOM`
- `Design Token`

### Wake

4. `Welcome`
- `Basic`
- icon / description
- `Semantic DOM`
- `Design Token`

5. `Prompts`
- `Basic`
- vertical / wrap
- children
- disabled
- `Semantic DOM`
- `Design Token`

### Express

6. `Sender`
- `Basic`
- loading
- submit
- multiline
- `Semantic DOM`
- `Design Token`

7. `Attachments`
- `Basic`
- items
- inline / drop
- overflow
- `Semantic DOM`
- `Design Token`

8. `Suggestion`
- `Basic`
- open / close
- select
- item count variants
- `Semantic DOM`
- `Design Token`

### Confirmation

9. `Think`
- `Basic`
- `Status`
- `Expand`
- `Semantic DOM`
- `Design Token`

10. `ThoughtChain`
- `Basic`
- `Status`
- `Expand`
- line styles when used
- blink
- `Semantic DOM`
- `Design Token`

### Feedback

11. `Actions`
- `Basic`
- subItems
- danger
- variant
- fade-in options
- `Semantic DOM`
- `Design Token`

12. `CodeHighlighter`
- `Basic`
- language variants
- long code
- `Semantic DOM`
- `Design Token`

13. `FileCard`
- `Basic`
- file / image / audio / video
- loading
- list
- size variants
- `Semantic DOM`
- `Design Token`

14. `Folder`
- `Basic`
- expand
- preview
- selected file
- custom preview render
- `Semantic DOM`
- `Design Token`

15. `Mermaid`
- `Basic`
- multiple diagram types
- copy / download / zoom
- error fallback
- `Semantic DOM`
- `Design Token`

16. `Sources`
- `Basic`
- `Icon`
- `Expand`
- `Inline`
- `Semantic DOM`
- `Design Token`

### Global

17. `XProvider`
- theme
- locale
- shell-wide consistency
- token override

## A2UI v0.9 Matrix

Must provide governed examples for:

- structured UI payload rendering
- agent-to-UI mapping
- dynamic card payload carrying
- schema-like UI object rendering inside chat
- safe fallback when A2UI payload is incomplete
- later convergence path to governed `X Card` / dynamic-surface usage

## Message Lifecycle Matrix

Every benchmark chat should provide examples for:

- start
- follow-up
- prompt
- confirmation
- error
- end
- thinking
- sources
- actions
- regenerate
- copy
- feedback
- folded content

## Theme / Playground Matrix

### Theme

- global theme baseline
- dark-first workspace shell strategy
- token override examples

### Playground

- component discovery through chat
- one active chat as the only primary stage
- component examples triggered from chat, not a permanent workbench
- must provide 4 governed examples:
  1. `Component Overview`
     - used to inspect the component family and jump into a specific example
  2. `Streaming Chat`
     - used to verify `useXChat / XRequest / XStream / Stream` behavior
  3. `Markdown + Rich Output`
     - used to verify `X Markdown / CodeHighlighter / Mermaid / Sources`
  4. `A2UI / Dynamic Surface`
     - used to verify structured UI payload carrying inside the main chat

## Current Delivery Order

Build and acceptance should proceed in this order:

1. technical baseline
2. streaming chat
3. RICH examples
4. component matrix
5. X Markdown
6. theme / playground
7. later replace official demo data with PMOS real data
