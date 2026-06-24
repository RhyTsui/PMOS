/**
 * 失败转译 Few-shot 示例
 *
 * 为 LLM 提供工具失败后的用户友好转译示例，避免暴露技术细节。
 */

export interface FailureTranslationExample {
  error_type: string;
  technical_message: string;
  expected_user_message: string;
  reasoning: string;
}

export const FAILURE_TRANSLATION_EXAMPLES: FailureTranslationExample[] = [
  {
    error_type: 'business_failed',
    technical_message: 'get_zt_ad_day_report business_failed: code=400, message=invalid_date_range',
    expected_user_message: '我这次没拿到日报数据。看起来不是你问法的问题，更像是报表能力返回了业务失败。我可以继续帮你判断是项目不支持、权限不足，还是当天无数据。',
    reasoning: '不暴露工具名和内部错误码，给用户可理解的说明和下一步建议。',
  },
  {
    error_type: 'empty',
    technical_message: 'query returned 0 rows',
    expected_user_message: '这次查询没有返回数据。可能是时间范围太早、筛选条件太严，或者这个维度暂时没有数据。要不要我换个时间范围或放宽筛选条件再查一次？',
    reasoning: '空结果不是错误，可能是查询条件问题，给用户可操作的建议。',
  },
  {
    error_type: 'permission_blocked',
    technical_message: 'access_denied: user does not have permission to access project_id=12345',
    expected_user_message: '这个查询需要特定项目权限，我目前没有访问权限。你可以联系管理员开通权限，或者换一个你有权限的项目查询。',
    reasoning: '权限问题要明确说明，给出解决路径，不暴露内部权限细节。',
  },
  {
    error_type: 'timeout',
    technical_message: 'MCP tool call timeout after 30000ms',
    expected_user_message: '这次查询超时了，可能是数据量太大或者系统暂时繁忙。要不要我缩小查询范围（比如只看最近 7 天）再试一次？',
    reasoning: '超时给用户可操作的建议（缩小范围），不暴露技术超时细节。',
  },
  {
    error_type: 'unsupported',
    technical_message: 'no capability found for service_type=ad_tag_insight',
    expected_user_message: '这个查询需要的能力当前还没有配置。我可以帮你查其他类型的数据，或者你可以联系管理员配置对应的能力。',
    reasoning: '能力缺失要明确说明，给出替代方案或解决路径。',
  },
];

/**
 * 生成失败转译 few-shot prompt 片段
 */
export function buildFailureTranslationFewShotPrompt(): string {
  const examples = FAILURE_TRANSLATION_EXAMPLES.slice(0, 3).map((ex) => {
    return `错误类型：${ex.error_type}\n技术信息：${ex.technical_message}\n→ 用户可见文案：${ex.expected_user_message}\n→ 转译依据：${ex.reasoning}`;
  });
  return examples.join('\n\n');
}
