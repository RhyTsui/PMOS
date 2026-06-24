/**
 * 歧义分类 Few-shot 示例
 *
 * 为 LLM 提供歧义分类示例，帮助判断歧义是否可放掉、是否需阻断。
 */

export interface AmbiguityClassificationExample {
  message: string;
  context?: string;
  expected_ambiguity_class: 'droppable' | 'blocking' | 'semi_executable';
  expected_risk_level: 'low' | 'medium' | 'high';
  reasoning: string;
}

export const AMBIGUITY_CLASSIFICATION_EXAMPLES: AmbiguityClassificationExample[] = [
  {
    message: '创新的数据咋样',
    context: '当前项目：三国杀移动版',
    expected_ambiguity_class: 'droppable',
    expected_risk_level: 'low',
    reasoning: '「创新」有歧义（可能指素材/活动/渠道），但用户只想看数据，低风险只读，可先查大盘再追问。',
  },
  {
    message: '最近 ROI 不太行',
    expected_ambiguity_class: 'semi_executable',
    expected_risk_level: 'low',
    reasoning: '用户表达效果下降，属于半执行场景，应先查最小证据集给出初步诊断，再追问是否深入。',
  },
  {
    message: '帮我把预算调高',
    expected_ambiguity_class: 'blocking',
    expected_risk_level: 'high',
    reasoning: '写操作，必须阻断确认，不允许默认执行。',
  },
  {
    message: '消耗咋样',
    context: '当前项目：原神',
    expected_ambiguity_class: 'droppable',
    expected_risk_level: 'low',
    reasoning: '用户想看消耗数据，虽然没说时间范围，但可默认近 7 天，低风险只读。',
  },
  {
    message: '数据不对',
    expected_ambiguity_class: 'semi_executable',
    expected_risk_level: 'low',
    reasoning: '用户反馈数据异常，属于半执行场景，应先查最小证据集定位问题，再追问是否深入排查。',
  },
  {
    message: '发起联调',
    expected_ambiguity_class: 'blocking',
    expected_risk_level: 'high',
    reasoning: '联调是写操作，必须确认项目、包、媒体等关键信息后才可执行。',
  },
];

/**
 * 生成歧义分类 few-shot prompt 片段
 */
export function buildAmbiguityFewShotPrompt(): string {
  const examples = AMBIGUITY_CLASSIFICATION_EXAMPLES.slice(0, 4).map((ex) => {
    const contextPart = ex.context ? `（${ex.context}）` : '';
    return `用户输入${contextPart}：${ex.message}\n→ 歧义类型：${ex.expected_ambiguity_class}\n→ 风险等级：${ex.expected_risk_level}\n→ 判断依据：${ex.reasoning}`;
  });
  return examples.join('\n\n');
}
