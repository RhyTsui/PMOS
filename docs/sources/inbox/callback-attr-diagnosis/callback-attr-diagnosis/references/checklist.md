# Callback Attr Diagnosis Checklist

用途：在使用 `callback-attr-diagnosis` skill 时，先用本清单确认输入与证据是否足够；具体规则以 `../SKILL.md` 的“结论前门禁”和分支章节为准。

## 调用前

- [ ] 已确认 `event_type`，未确认时先追问，不默认成 `PAY`。
- [ ] 已确认 `app_package_type`，未确认时先追问，不跨平台套经验。
- [ ] 已确认 `date_start` / `date_end` 与用户问题一致，尤其年份无漂移。
- [ ] 已通过 `diag.fetch_app_context` 得到 canonical 数字 `app_id`。
- [ ] 已通过 `diag.fetch_media_context` 得到 canonical 数字 `media_id`，多候选时先让用户确认。

## 调用中

- [ ] 后续工具只使用 canonical `app_id` / `media_id`，不再使用游戏代号、媒体名或 `media_code`。
- [ ] 每个 0 行结果都先做参数一致性复核，再进入业务判断。
- [ ] 先判断 SDK / API / iOS-Harmony 分支，再引用对应分支证据。
- [ ] sample 只作样本说明，结论优先使用 aggregate 总量。
- [ ] `problem_desc` 只在首个业务排查工具中保留完整用户问题。

## 结论前

- [ ] 已写明应用、媒体、平台、事件、时间窗。
- [ ] 已区分基础事件、归因预处理、回推闭环、媒体/报表口径。
- [ ] Android SDK 分支已完成关键总量对账。
- [ ] `804`、`push_media_code`、`feedback-res` 未越级替代当前分支主证据。
- [ ] 最终结论没有命中 `SKILL.md` 中 Golden Case 的禁止结论。
