import { NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-discovery';
import { listMcpServers } from '@/lib/mcp-server-store';

type McpServer = Awaited<ReturnType<typeof listMcpServers>>[number];

function findDebugAutomationServer(servers: McpServer[]) {
  return servers.find(server => (
    server.enabled &&
    Boolean(server.endpoint_url) &&
    (
      /自动联调|debug.*automation|auto.*debug/i.test(`${server.id} ${server.name} ${server.description}`) ||
      server.tools.some(tool => /debug_automation_|debug\./.test(`${tool.name} ${tool.tool_id}`))
    )
  ));
}

function getToolNames(server: McpServer) {
  return new Set(server.tools.flatMap(tool => [tool.name, tool.tool_id].filter(Boolean)));
}

function pickTool(toolNames: Set<string>, candidates: string[]) {
  return candidates.find(name => toolNames.has(name));
}

function parseMcpTextPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.content)) {
    const texts = record.content
      .map(item => (item && typeof item === 'object' ? (item as Record<string, unknown>).text : ''))
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
    if (texts.length === 1) {
      try {
        return JSON.parse(texts[0]);
      } catch {
        return texts[0];
      }
    }
    if (texts.length > 1) {
      return texts.map(text => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      });
    }
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function extractArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of ['steps', 'list', 'items', 'data', 'records', 'result']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return repairMojibakeText(value.trim());
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function repairMojibakeText(value: string) {
  if (!/[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(value)) {
    return value;
  }
  if (/[\u4e00-\u9fff]/.test(value)) return value;
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code > 255) return value;
    bytes.push(code);
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

function parseJsonRecord(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    return asRecord(parsed);
  } catch {
    return {};
  }
}

function getServerOrigin(endpointUrl: string) {
  try {
    return new URL(endpointUrl).origin;
  } catch {
    return '';
  }
}

function normalizeAssetUrl(value: string, assetBaseUrl: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && assetBaseUrl) return `${assetBaseUrl}${value}`;
  return value;
}

function collectScreenshots(value: unknown, output: string[] = [], assetBaseUrl = ''): string[] {
  if (!value) return output;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) || /^\/api\//i.test(value) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)) {
      output.push(normalizeAssetUrl(value, assetBaseUrl));
    }
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectScreenshots(item, output, assetBaseUrl));
    return output;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (/screenshot|image|截图|shot|url/i.test(key)) collectScreenshots(item, output, assetBaseUrl);
      else if (typeof item === 'object') collectScreenshots(item, output, assetBaseUrl);
    });
  }
  return Array.from(new Set(output)).slice(0, 12);
}

function normalizeLogLine(line: string) {
  const originalText = repairMojibakeText(line);
  const titleMappings: Array<[RegExp, string]> = [
    [/事件资产主内容已加载/i, '事件资产主内容已加载'],
    [/已勾选复选框/i, '已勾选复选框'],
    [/正在弹窗中寻找渠道号/i, '正在弹窗中寻找渠道号'],
    [/tr\s*策略失败，?降级为后续节点点击/i, 'tr 策略失败，降级为后续节点点击'],
    [/下拉选项\s*selector\s*命中/i, '选中下拉选项'],
    [/推送二维码到\s+\/sdcard\/DCIM\/Camera/i, '推送二维码到手机'],
    [/刷新媒体库\s+\/sdcard\/DCIM\/Camera/i, '刷新手机相册'],
    [/Broadcast completed/i, '刷新手机相册完成'],
    [/手机端文件确认/i, '手机相册确认'],
    [/二维码已成功推送到手机相册/i, '二维码已成功推送到手机相册'],
    [/关闭游戏进程/i, '关闭游戏进程，确保后续点击广告产生启动事件'],
    [/关闭抖音并重新启动/i, '关闭抖音并重新启动'],
    [/系统解析到抖音启动\s*Activity/i, '系统解析到抖音启动'],
    [/第\s*\d+\/\d+\s*次确认抖音启动状态/i, '确认抖音启动状态'],
    [/抖音已进入前台/i, '抖音已进入前台，具备后续扫码入口操作条件'],
    [/相册预览候选区域/i, '相册预览'],
    [/授权按钮蓝色区域/i, '授权按钮蓝色区域'],
    [/手机端已点击授权/i, '手机端已点击授权'],
    [/第\s*\d+\s*次确认截图/i, '确认截图'],
    [/触发事件并回传.*确认手机端授权成功/i, '触发事件并回传，确认手机端授权成功'],
    [/正在判断图片/i, '正在判断图片'],
    [/UIAutomator\s*关键词检测\s*转化联调广告/i, '关键词检测 转化联调广告'],
  ];
  const mappedTitle = titleMappings.find(([pattern]) => pattern.test(originalText))?.[1];
  if (mappedTitle) return mappedTitle;

  let text = originalText
    .replace(/^\d{4}-\d{2}-\d{2}[^\[]+\[[A-Z]+\]\s+[^:]+:\s*/, '')
    .replace(/\s*screenshot_url=.+$/i, '')
    .trim();
  if (!text || /XQ_PROGRESS|Debug runner starting|Pending task found|Starting execution|Call log:|waiting for locator|截图证据目录/i.test(text)) return '';
  if (/Screenshot uploaded|上传步骤截图|上传截图/i.test(text)) return '';
  const bracketMatch = text.match(/\[(?:Web|Mobile|Game|回传|[^[]+?)\s*Step[^\]]*\]\s*(.+)$/i);
  if (bracketMatch?.[1]) text = bracketMatch[1].trim();
  text = text
    .replace(/^OK\s*/i, '')
    .replace(/^\.{3}\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s*(before|after|triggered)=.+$/i, '')
    .replace(/[A-Z]:\\[^，。；\s]+/g, '本地文件')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function inferSubStepStatus(line: string) {
  const text = repairMojibakeText(line);
  if (/\b(False|FAIL|FAILED|ERROR)\b|失败|异常|未通过/i.test(text)) return 'error';
  if (/\b(PENDING|WAIT|RUNNING)\b|等待|运行中|处理中/i.test(text)) return 'running';
  if (/\b(True|OK|SUCCESS|DONE|PASSED)\b|成功|通过|完成/i.test(text)) return 'success';
  return 'success';
}

function normalizeSubStepTitle(title: string) {
  return title
    .replace(/\s*[:：]\s*(True|False|OK|SUCCESS|DONE|FAILED|ERROR|PENDING|RUNNING|WAIT)$/i, '')
    .replace(/\s*[:：]\s*(成功|失败|异常|通过|未通过|等待|运行中|完成)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRunningStatus(status: string) {
  return /\b(RUN|RUNNING|DISPATCH|PENDING|WAIT)\b|执行|等待|运行中|处理中/i.test(status);
}

function isFailedStatus(status: string) {
  return /\b(FAIL|FAILED|ERROR)\b|失败|异常/i.test(status);
}

function buildSubSteps(lines: string[], parentStatus: string) {
  const subSteps: Array<{ title: string; status: string }> = [];
  const parentStillRunning = isRunningStatus(parentStatus) && !isFailedStatus(parentStatus);
  lines.forEach((line) => {
    const title = normalizeSubStepTitle(normalizeLogLine(line));
    if (!title) return;
    const inferredStatus = inferSubStepStatus(line);
    const status = !parentStillRunning && inferredStatus === 'running' ? 'success' : inferredStatus;
    const existing = subSteps.find(item => item.title === title);
    if (!existing) {
      subSteps.push({ title, status });
      return;
    }
    if (existing.status !== 'error') existing.status = status;
  });
  return subSteps.slice(0, 8).map((item, index) => ({
    id: `sub-${index + 1}`,
    order: index + 1,
    title: item.title,
    status: item.status,
  }));
}

function normalizeStep(value: unknown, index: number, assetBaseUrl: string) {
  const record = asRecord(value);
  const logText = readString(record, ['logText', 'log_text', 'log']);
  const logRecord = logText ? parseJsonRecord(logText) : {};
  const progress = asRecord(logRecord.progress);
  const lines = Array.isArray(logRecord.lines)
    ? logRecord.lines
      .filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
      .map(line => repairMojibakeText(line.trim()))
    : [];
  const status = readString(progress, ['status'])
    || readString(record, ['status', 'state', 'status_label', 'statusLabel', 'result'])
    || 'pending';
  const progressStepCode = readString(progress, ['global_step_code']);
  const elapsedSeconds = readString(progress, ['elapsed_seconds']);
  const explicitLog = readString(record, ['log_summary', 'message', 'detail', 'error_message', 'errorMessage', 'summary']);
  const lineSummary = lines.slice(-3).join('\n').slice(0, 600);
  const metaLog = [
    progressStepCode ? `步骤 ${progressStepCode}` : '',
    elapsedSeconds ? `耗时 ${elapsedSeconds}s` : '',
  ].filter(Boolean).join(' · ');
  const log = [explicitLog, metaLog, lineSummary].filter(Boolean).join('\n');

  return {
    id: readString(record, ['id', 'step_id', 'stepId']) || `step-${index + 1}`,
    order: index + 1,
    step_no: progressStepCode || readString(record, ['step_order', 'order', 'index', 'seq', 'stepIndex', 'step_index']),
    title: readString(progress, ['step_description'])
      || readString(record, ['step_description', 'stepDescription', 'stepName', 'step_name', 'name', 'title', 'label', 'current_step'])
      || `步骤 ${index + 1}`,
    stage: readString(progress, ['phase']) || readString(record, ['stage', 'phase', 'group']) || '',
    status,
    status_label: readString(record, ['status_label', 'statusText', 'statusLabel']) || status,
    time: readString(progress, ['timestamp'])
      || readString(record, ['time', 'created_at', 'createdAt', 'updated_at', 'updatedAt', 'started_at', 'startedAt', 'completed_at', 'completedAt'])
      || '',
    log,
    sub_steps: buildSubSteps(lines, status),
    screenshots: collectScreenshots({ record, progress }, [], assetBaseUrl),
    raw: record,
  };
}

function isTerminalSuccessStatus(status: string) {
  return /\b(SUCCESS|SUCCEEDED|FINISHED|COMPLETED|DONE|OK)\b|成功|完成|通过/i.test(status);
}

function deriveDebugCompletion(rawStatus: string, steps: ReturnType<typeof normalizeStep>[]) {
  const joinedText = steps
    .map(step => [
      step.title,
      step.stage,
      step.status,
      step.status_label,
      step.log,
      ...(step.sub_steps || []).map(subStep => `${subStep.title} ${subStep.status}`),
    ].join('\n'))
    .join('\n');
  const reachedGameLaunch = /点击广告并拉起游戏|等待游戏启动|游戏登录|启动游戏/i.test(joinedText);
  const reachedCallbackPolling = /事件回传轮询|回传轮询|激活[:：]\s*OK|注册[:：]\s*OK/i.test(joinedText);
  const allDefaultEventsOk = ['激活', '注册', '付费', '关键行为'].every((eventName) =>
    new RegExp(`${eventName}\\s*[:：]\\s*(OK|SUCCESS|DONE|成功|通过)`, 'i').test(joinedText),
  );

  if (!isTerminalSuccessStatus(rawStatus)) {
    return { status: rawStatus, statusLabel: rawStatus, incompleteReason: '' };
  }

  if (reachedGameLaunch && reachedCallbackPolling && allDefaultEventsOk) {
    return { status: rawStatus, statusLabel: rawStatus, incompleteReason: '' };
  }

  const missing = [
    !reachedGameLaunch ? '未观测到游戏启动/登录' : '',
    !reachedCallbackPolling ? '未进入事件回传轮询' : '',
    reachedCallbackPolling && !allDefaultEventsOk ? '默认事件未全部回传成功' : '',
  ].filter(Boolean);

  return {
    status: 'INCOMPLETE',
    statusLabel: '联调未完成',
    incompleteReason: `MCP 返回完成态，但关键验收步骤不足：${missing.join('、') || '缺少终态证据'}`,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const servers = await listMcpServers();
  const server = findDebugAutomationServer(servers);
  if (!server) {
    return NextResponse.json({ ok: false, message: '未找到已启用的自动联调 MCP。' }, { status: 404 });
  }

  const toolNames = getToolNames(server);
  const taskTool = pickTool(toolNames, ['debug_automation_get_task', 'debug.get_task']);
  const stepsTool = pickTool(toolNames, ['debug_automation_get_steps', 'debug.watch_steps']);
  const resultTool = pickTool(toolNames, ['debug_automation_get_result', 'debug.get_result']);
  const serverConfig = {
    endpoint_url: server.endpoint_url,
    transport: server.transport,
    auth_type: server.auth_type,
    auth_config: server.auth_config,
  };

  const [taskCall, stepsCall, resultCall] = await Promise.all([
    taskTool ? callMcpTool(serverConfig, taskTool, { task_id: id }) : Promise.resolve(null),
    stepsTool ? callMcpTool(serverConfig, stepsTool, { task_id: id }) : Promise.resolve(null),
    resultTool ? callMcpTool(serverConfig, resultTool, { task_id: id }) : Promise.resolve(null),
  ]);

  const task = taskCall?.ok ? parseMcpTextPayload(taskCall.result) : null;
  const stepsPayload = stepsCall?.ok ? parseMcpTextPayload(stepsCall.result) : null;
  const result = resultCall?.ok ? parseMcpTextPayload(resultCall.result) : null;
  const taskRecord = asRecord(task);
  const resultRecord = asRecord(result);
  const assetBaseUrl = getServerOrigin(server.endpoint_url);
  const steps = extractArray(stepsPayload).map((step, index) => normalizeStep(step, index, assetBaseUrl));
  const screenshots = collectScreenshots({ task, stepsPayload, result }, [], assetBaseUrl);
  const rawStatus = readString(taskRecord, ['status', 'state'])
    || readString(resultRecord, ['status', 'state'])
    || 'UNKNOWN';
  const completion = deriveDebugCompletion(rawStatus, steps);

  return NextResponse.json({
    ok: true,
    task_id: id,
    server: server.name,
    status: completion.status,
    raw_status: rawStatus,
    status_label: completion.statusLabel || readString(taskRecord, ['status_label', 'statusLabel']) || readString(resultRecord, ['status_label', 'statusLabel']) || completion.status,
    current_step: readString(taskRecord, ['current_step', 'currentStep']) || readString(resultRecord, ['current_step', 'currentStep']),
    phase: readString(taskRecord, ['phase']) || readString(resultRecord, ['phase']),
    error_message: completion.incompleteReason || readString(taskRecord, ['error_message', 'errorMessage']) || readString(resultRecord, ['error_message', 'errorMessage']),
    updated_at: readString(taskRecord, ['updated_at', 'updatedAt']) || readString(resultRecord, ['updated_at', 'updatedAt']),
    steps,
    screenshots,
    result,
    raw: { task, steps: stepsPayload, result },
    observation_errors: [
      taskCall && !taskCall.ok ? taskCall.msg : '',
      stepsCall && !stepsCall.ok ? stepsCall.msg : '',
      resultCall && !resultCall.ok ? resultCall.msg : '',
    ].filter(Boolean),
  });
}
