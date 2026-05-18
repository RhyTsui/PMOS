import type { V07RuntimeGovernanceSnapshot } from '../../shared/schemas';

type Props = {
  snapshot: V07RuntimeGovernanceSnapshot | null;
  busy: boolean;
  onRefresh: () => void;
  onPromote: (candidateId: string) => Promise<void> | void;
};

function getTraceStatus(status: 'pass' | 'warn' | 'missing') {
  if (status === 'pass') {
    return 'ok';
  }
  if (status === 'warn') {
    return 'warning';
  }
  return 'pending';
}

export function V07RuntimeGovernancePanel({ snapshot, busy, onRefresh, onPromote }: Props) {
  return (
    <section className="inspector-panel">
      <div className="section-header">
        <h3>v0.7 Runtime Governance</h3>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={busy}>
          刷新
        </button>
      </div>
      {!snapshot ? (
        <div className="inspector-empty">当前还没有加载到 v0.7 runtime governance 快照。</div>
      ) : (
        <>
          <div className="metric-tile-grid">
            <article className="metric-tile">
              <span className="metric-tile__label">阶段 Agent 编排</span>
              <strong>{snapshot.backcheck.stageAgentOrchestration}</strong>
              <span>
                {snapshot.stageAgents.filter((item) => item.status === 'pass').length} / {snapshot.stageAgents.length} 个阶段已有运行证据
              </span>
            </article>
            <article className="metric-tile">
              <span className="metric-tile__label">UI 规范自动生效</span>
              <strong>{snapshot.backcheck.uiSpecActivationGate}</strong>
              <span>{snapshot.uiSpecActivation.activeSpecPaths.length} 份 active spec</span>
            </article>
            <article className="metric-tile">
              <span className="metric-tile__label">重复纠正记忆</span>
              <strong>{snapshot.backcheck.repeatCorrectionMemory}</strong>
              <span>
                {snapshot.repeatCorrectionCandidates.filter((item) => item.status === 'promoted').length} /{' '}
                {snapshot.repeatCorrectionCandidates.length} 个候选已升格为 requirement
              </span>
            </article>
            <article className="metric-tile">
              <span className="metric-tile__label">Skill 生效检查</span>
              <strong>{snapshot.backcheck.skillEffectivenessCheck}</strong>
              <span>
                {snapshot.skillEffectivenessChecks.filter((item) => item.status === 'pass').length} /{' '}
                {snapshot.skillEffectivenessChecks.length} 个 skill 已有显式生效证据
              </span>
            </article>
            <article className="metric-tile">
              <span className="metric-tile__label">设计工具生效检查</span>
              <strong>{snapshot.backcheck.designToolEffectivenessCheck}</strong>
              <span>
                {snapshot.designToolEffectivenessChecks.filter((item) => item.status === 'pass').length} /{' '}
                {snapshot.designToolEffectivenessChecks.length} 个设计工具已有影响证据
              </span>
            </article>
            <article className="metric-tile">
              <span className="metric-tile__label">组件复用记忆</span>
              <strong>{snapshot.backcheck.componentReuseMemory}</strong>
              <span>
                {snapshot.componentReuseMemoryChecks.filter((item) => item.status === 'pass').length} /{' '}
                {snapshot.componentReuseMemoryChecks.length} 个对象已进入默认复用闭环
              </span>
            </article>
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>阶段 Agent 编排</h4>
          </div>
          <div className="trace-list">
            {snapshot.stageAgents.map((stage) => (
              <article key={stage.stageId} className={`trace-event trace-event--${getTraceStatus(stage.status)}`}>
                <div className="trace-event__kind">{stage.label}</div>
                <div className="trace-event__detail">{stage.defaultMode}</div>
                <div className="trace-event__meta">{stage.summary}</div>
                {stage.requiredBehaviors.map((item, index) => (
                  <div key={`${stage.stageId}-rule-${index + 1}`} className="trace-event__artifact">
                    {item}
                  </div>
                ))}
                {stage.evidencePaths.slice(0, 3).map((evidencePath) => (
                  <div key={evidencePath} className="trace-event__artifact">
                    {evidencePath}
                  </div>
                ))}
              </article>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>UI 规范自动生效</h4>
          </div>
          <article className={`trace-event trace-event--${getTraceStatus(snapshot.uiSpecActivation.status)}`}>
            <div className="trace-event__kind">UI spec gate</div>
            <div className="trace-event__detail">{snapshot.uiSpecActivation.summary}</div>
            <div className="trace-event__meta">
              规则覆盖：
              {snapshot.uiSpecActivation.effectiveRules.length > 0
                ? snapshot.uiSpecActivation.effectiveRules.join(' / ')
                : '尚未识别到规则证据'}
            </div>
            {snapshot.uiSpecActivation.activeSpecPaths.map((specPath) => (
              <div key={specPath} className="trace-event__artifact">
                {specPath}
              </div>
            ))}
            {snapshot.uiSpecActivation.missingSignals.map((signal) => (
              <div key={signal} className="trace-event__artifact">
                缺口：{signal}
              </div>
            ))}
          </article>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>重复纠正记忆</h4>
          </div>
          <div className="trace-list">
            {snapshot.repeatCorrectionCandidates.length === 0 ? (
              <div className="inspector-empty">当前还没有识别到重复纠正候选。</div>
            ) : (
              snapshot.repeatCorrectionCandidates.map((candidate) => (
                <article
                  key={candidate.candidateId}
                  className={`trace-event trace-event--${candidate.status === 'promoted' ? 'ok' : 'warning'}`}
                >
                  <div className="trace-event__kind">
                    {candidate.scope} / {candidate.status}
                  </div>
                  <div className="trace-event__detail">{candidate.label}</div>
                  <div className="trace-event__meta">
                    信号 {candidate.signalCount} 次 / {candidate.summary}
                  </div>
                  {candidate.evidencePaths.slice(0, 4).map((evidencePath) => (
                    <div key={evidencePath} className="trace-event__artifact">
                      {evidencePath}
                    </div>
                  ))}
                  <div className="trace-event__artifact">
                    {candidate.promotedRequirementId ? (
                      <>已升格进需求池：{candidate.promotedRequirementId}</>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void onPromote(candidate.candidateId)}
                        disabled={busy}
                      >
                        升格进需求池
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>Skill 生效检查</h4>
          </div>
          <div className="trace-list">
            {snapshot.skillEffectivenessChecks.length === 0 ? (
              <div className="inspector-empty">当前还没有可评估的 design / frontend skill 对象。</div>
            ) : (
              snapshot.skillEffectivenessChecks.map((check) => (
                <article key={check.skillId} className={`trace-event trace-event--${getTraceStatus(check.status)}`}>
                  <div className="trace-event__kind">
                    {check.integration} / {check.status}
                  </div>
                  <div className="trace-event__detail">{check.name}</div>
                  <div className="trace-event__meta">{check.summary}</div>
                  {check.evidencePaths.map((evidencePath) => (
                    <div key={`${check.skillId}-${evidencePath}`} className="trace-event__artifact">
                      {evidencePath}
                    </div>
                  ))}
                  {check.missingSignals.map((signal) => (
                    <div key={`${check.skillId}-${signal}`} className="trace-event__artifact">
                      缺口：{signal}
                    </div>
                  ))}
                </article>
              ))
            )}
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>设计工具生效检查</h4>
          </div>
          <div className="trace-list">
            {snapshot.designToolEffectivenessChecks.length === 0 ? (
              <div className="inspector-empty">当前还没有可评估的设计工具对象。</div>
            ) : (
              snapshot.designToolEffectivenessChecks.map((check) => (
                <article key={check.toolId} className={`trace-event trace-event--${getTraceStatus(check.status)}`}>
                  <div className="trace-event__kind">
                    {check.integration} / {check.status}
                  </div>
                  <div className="trace-event__detail">{check.label}</div>
                  <div className="trace-event__meta">{check.summary}</div>
                  {check.evidencePaths.map((evidencePath) => (
                    <div key={`${check.toolId}-${evidencePath}`} className="trace-event__artifact">
                      {evidencePath}
                    </div>
                  ))}
                  {check.missingSignals.map((signal) => (
                    <div key={`${check.toolId}-${signal}`} className="trace-event__artifact">
                      缺口：{signal}
                    </div>
                  ))}
                </article>
              ))
            )}
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <h4>组件复用记忆</h4>
          </div>
          <div className="trace-list">
            {snapshot.componentReuseMemoryChecks.length === 0 ? (
              <div className="inspector-empty">当前还没有可评估的组件复用对象。</div>
            ) : (
              snapshot.componentReuseMemoryChecks.map((check) => (
                <article key={check.candidateId} className={`trace-event trace-event--${getTraceStatus(check.status)}`}>
                  <div className="trace-event__kind">{check.status}</div>
                  <div className="trace-event__detail">{check.label}</div>
                  <div className="trace-event__meta">{check.summary}</div>
                  {check.promotedRequirementId ? (
                    <div className="trace-event__artifact">已升格 requirement：{check.promotedRequirementId}</div>
                  ) : null}
                  {check.reusableComponentSignals.map((signal) => (
                    <div key={`${check.candidateId}-${signal}`} className="trace-event__artifact">
                      复用信号：{signal}
                    </div>
                  ))}
                  {check.evidencePaths.map((evidencePath) => (
                    <div key={`${check.candidateId}-${evidencePath}`} className="trace-event__artifact">
                      {evidencePath}
                    </div>
                  ))}
                  {check.missingSignals.map((signal) => (
                    <div key={`${check.candidateId}-${signal}`} className="trace-event__artifact">
                      缺口：{signal}
                    </div>
                  ))}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
