# AI Product-Development Loop Template

- status: draft
- audience: product / engineering / testing / version governance

## Version / Scope

- version:
- business scope:
- in scope:
- out of scope:
- owner:

## Product Package

### Built-In Delivery Chain

- 调研文档
- 规划文档
- 需求文档
- 功能文档
- 设计文档
- 前端页面
- 数据表
- 后端接口
- 联调与验收

### 调研文档

- problem statement:
- target users / operators:
- current pain points:
- build-vs-buy conclusion:
- competitor / benchmark notes:
- risks and unknowns:

### 规划文档

- version goal:
- milestones:
- dependency order:
- current release inclusion:
- deferred items:

### 需求文档

- original user requirements:
- product requirements:
- requirement priority:
- acceptance criteria:
- requirement-to-function breakdown matrix:

| Requirement ID | Requirement Summary | User Value | Function IDs | Acceptance |
| --- | --- | --- | --- | --- |
| R-001 | To define | To define | F-001 | To define |

- quality gate:
  - important requirements are decomposed to function level
  - each requirement has traceable acceptance
  - no requirement stays only at slogan level

### 功能文档

- module inventory:
- core flows:
- state machine / status set:
- core object model:
- boundary and exception notes:
- function-to-api mapping:

| Function ID | Function Summary | Trigger | Inputs | Outputs / Response | API / Event Candidate | Permission / Error Notes |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | To define | To define | To define | To define | API-001 | To define |

- quality gate:
  - important functions are decomposed to interface level
  - functions can explain trigger, data, and response
  - frontend and backend can execute from the same contract

### 设计文档

- page inventory:
- information architecture:
- navigation structure:
- page-to-function mapping:
- key user flows:
- key interaction flows:
- page states:
- empty / error / exceptional states:

### 前端页面

- ui spec source:
- page layout rationale:
- module responsibility:
- interactive states:
- component semantics:
- design delivery manifest:
- quality gate:
  - typography / spacing / radius / states are explicit
  - layout and module structure are explicit
  - user flow and dynamic interaction are explicit
  - output is delivery-grade rather than a low-fidelity placeholder

### 数据表

- entity list:
- field definitions:
- relation definitions:
- lifecycle / audit notes:

### 后端接口

- API inventory:
- request / response contracts:
- error codes:
- permission semantics:
- integration assumptions:

### 联调与验收

- integration flows:
- blocked items:
- acceptance result:
- rework destination:

## Human-Facing Assets

- demo script:
- release notes:
- user manual:

## AI-Facing Assets

- prompt package:
- governed rules:
- reusable specs / schemas:

## Implementation Package

### Architecture Boundary

### API / Data Assumptions

### Frontend / Backend Integration Plan

### Deployability Assumptions

## Testing Package

### AI Testing Validation Scope

### Acceptance Flows

### Regression Pack

### User Story Trace

- original user demand links
- user stories derived from original demand
- test cases mapped to user stories
- uncovered original-demand scenarios

## Change Propagation

When requirement changes, sync impact to:

- demo
- requirement doc
- functional spec
- design package
- frontend page package
- data schema
- backend API
- implementation package
- version package
- testing package

## Approval / Trace Links

- requirement links
- version links
- artifact links
- testing result links
