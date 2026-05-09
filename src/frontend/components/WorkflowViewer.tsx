import type { WorkflowRun } from '../../shared/schemas';

type Props = {
  workflow: WorkflowRun;
  busy?: boolean;
  onAdvance?: () => void;
  onRunUntilBlocked?: () => void;
};

const statusLabels: Record<WorkflowRun['status'] | 'pending' | 'active' | 'blocked', string> = {
  draft: '草稿',
  running: '运行中',
  completed: '已完成',
  'needs-rework': '需返工',
  blocked: '已阻塞',
  pending: '待开始',
  active: '进行中',
};

export function WorkflowViewer({ workflow, busy = false, onAdvance, onRunUntilBlocked }: Props) {
  const canOperate = (workflow.status === 'running' || workflow.status === 'needs-rework') && !!workflow.currentStageId;

  return (
    <div>
      <div className="meta-row">
        <span>{workflow.name}</span>
        <span>{statusLabels[workflow.status]}</span>
        <span>runId: {workflow.id}</span>
        <span>{new Date(workflow.generatedAt).toLocaleString('zh-CN')}</span>
      </div>
      <div className="meta-row">
        <span>项目：{workflow.projectName}</span>
        <span>子项目：{workflow.subprojectId ?? 'platform'}</span>
        <span>根目录：{workflow.projectRoot || '.'}</span>
      </div>
      <div className="meta-row">
        <span>当前阶段：{workflow.currentStageId ?? '已完成'}</span>
        <span>Provider：{workflow.providerCount}</span>
        <span>MCP：{workflow.mcpServerCount}</span>
      </div>
      <div className="action-row">
        <button type="button" className="primary-button" onClick={onAdvance} disabled={!canOperate || busy}>
          {busy ? '执行中...' : '推进当前阶段'}
        </button>
        <button type="button" className="secondary-button" onClick={onRunUntilBlocked} disabled={!canOperate || busy}>
          运行至阻塞/完成
        </button>
      </div>
      <div className="stage-list">
        {workflow.stages.map((stage) => (
          <div key={stage.id} className={`stage-card stage-${stage.status}`}>
            <div className="stage-header">
              <strong>{stage.label}</strong>
              <span>{statusLabels[stage.status]}</span>
              {stage.id === 'multimodal' ? <span>AI Studio / 多模态</span> : null}
            </div>
            <p>{stage.description}</p>
            <ul>
              {stage.outputPaths.length > 0 ? (
                stage.outputPaths.map((path) => <li key={path}>{path}</li>)
              ) : (
                <li>尚未写入产物</li>
              )}
            </ul>
            {stage.blockedReason ? <p>阻塞原因：{stage.blockedReason}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
