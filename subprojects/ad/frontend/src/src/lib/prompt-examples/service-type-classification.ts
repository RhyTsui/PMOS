/**
 * 服务类型分类 Few-shot 示例
 *
 * 为 LLM 提供典型场景的服务类型判断示例，提升模糊表达下的分类准确率。
 */

export interface ServiceTypeClassificationExample {
  message: string;
  context?: string;
  expected_service_type: string;
  reasoning: string;
}

export const SERVICE_TYPE_CLASSIFICATION_EXAMPLES: ServiceTypeClassificationExample[] = [
  {
    message: '创新的数据咋样',
    context: '当前项目：三国杀移动版',
    expected_service_type: 'data_query',
    reasoning: '用户想看数据表现，虽然有歧义（创新指什么），但核心诉求是数据查询，应先走 data_query 再追问歧义。',
  },
  {
    message: 'ROI 不太行',
    context: '当前项目：原神',
    expected_service_type: 'roi_diagnosis',
    reasoning: '用户表达效果下降，属于诊断类服务，应进入 roi_diagnosis 而非普通数据查询。',
  },
  {
    message: '帮我把预算调高',
    expected_service_type: 'automation_task',
    reasoning: '用户要求执行写操作（调整预算），属于自动化任务，必须走确认后执行流程。',
  },
  {
    message: '这个包能用吗',
    context: '当前项目：明日方舟',
    expected_service_type: 'package_fetch',
    reasoning: '用户询问包状态，属于包服务，不应被报表查询抢占。',
  },
  {
    message: '发起联调',
    expected_service_type: 'integration_workflow',
    reasoning: '用户要求发起联调流程，属于联调服务，必须走确认流程。',
  },
  {
    message: '昨天效果怎么样',
    context: '当前项目：崩坏：星穹铁道',
    expected_service_type: 'data_query',
    reasoning: '用户想看昨天的数据表现，属于标准数据查询，时间范围明确。',
  },
  {
    message: '现在北京天气如何',
    expected_service_type: 'public_web_search',
    reasoning: '用户询问实时公开信息，应走公开网络检索，不走内部报表链路。',
  },
  {
    message: '上传 Excel 模板帮我拼日报',
    expected_service_type: 'file_excel_report',
    reasoning: '用户要求基于文件生成报表，应走文件报表服务，不走普通数据查询。',
  },
];

/**
 * 生成 few-shot prompt 片段
 */
export function buildServiceTypeFewShotPrompt(): string {
  const examples = SERVICE_TYPE_CLASSIFICATION_EXAMPLES.slice(0, 5).map((ex) => {
    const contextPart = ex.context ? `（${ex.context}）` : '';
    return `用户输入${contextPart}：${ex.message}\n→ 服务类型：${ex.expected_service_type}\n→ 判断依据：${ex.reasoning}`;
  });
  return examples.join('\n\n');
}
