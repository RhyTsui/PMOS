import type { CommitteeReport } from '../../shared/schemas';

type Props = {
  report: CommitteeReport | null;
};

function toIssueTone(decision: 'Pass' | 'Conditional' | 'Reject') {
  switch (decision) {
    case 'Reject':
      return 'error';
    case 'Conditional':
      return 'warning';
    default:
      return 'ok';
  }
}

export function ReviewPanel({ report }: Props) {
  const activationTrace = report?.activationTrace ?? [];
  if (!report) {
    return (
      <section className="inspector-panel">
        <h3>Review Gate</h3>
        <div className="inspector-empty">No review report is available for the selected run yet.</div>
      </section>
    );
  }

  return (
    <section className="inspector-panel">
      <h3>Review Gate</h3>
      <article className={`trace-event trace-event--${report.gate.blocked ? 'warning' : 'ok'}`}>
        <div className="trace-event__kind">{report.gate.decision}</div>
        <div className="trace-event__detail">{report.overallConclusion}</div>
        <div className="trace-event__meta">
          next stage: {report.nextStage ? 'allowed' : 'blocked'} / rework: {report.reworkRequired ? 'required' : 'not required'}
        </div>
        <div className="trace-event__meta">
          blocking stage: {report.gate.blockingStageId ?? '-'} / issue count: {report.gate.issueCount}
        </div>
        {report.summary ? <div className="trace-event__artifact">{report.summary}</div> : null}
      </article>

      <article className={`trace-event trace-event--${report.hermes.overallDecision === 'block' ? 'error' : report.hermes.overallDecision === 'revise' ? 'warning' : 'ok'}`}>
        <div className="trace-event__kind">Hermes {report.hermes.overallDecision}</div>
        <div className="trace-event__detail">{report.hermes.summary}</div>
        {report.hermes.knowledgeGrounding.summary ? (
          <div className="trace-event__meta">
            knowledge grounding: {report.hermes.knowledgeGrounding.summary}
          </div>
        ) : null}
        {report.hermes.knowledgeGrounding.query ? (
          <div className="trace-event__artifact">
            query: {report.hermes.knowledgeGrounding.query} / hits: {report.hermes.knowledgeGrounding.resultCount}
          </div>
        ) : null}
        {report.hermes.writebackClosure.summary ? (
          <div className="trace-event__artifact">
            writeback: {report.hermes.writebackClosure.summary}
          </div>
        ) : null}
        {report.hermes.watchClosure.summary ? (
          <div className="trace-event__artifact">
            watch: {report.hermes.watchClosure.summary}
          </div>
        ) : null}
        {report.hermes.watchClosure.recurringFindings > 0 || report.hermes.watchClosure.suppressedFindings > 0 ? (
          <div className="trace-event__artifact">
            recurring: {report.hermes.watchClosure.recurringFindings} / suppressed:{' '}
            {report.hermes.watchClosure.suppressedFindings}
          </div>
        ) : null}
        {report.hermes.actions.map((action) => (
          <div key={`${action.action}-${action.target}`} className="trace-event__artifact">
            {action.action} {'->'} {action.target}: {action.reason}
          </div>
        ))}
      </article>

      <article
        className={`trace-event trace-event--${
          activationTrace.some((item) => item.required && (!item.activated || item.status === 'assumed')) ? 'warning' : 'ok'
        }`}
      >
        <div className="trace-event__kind">Specialist Activation</div>
        <div className="trace-event__detail">
          required {activationTrace.filter((item) => item.required).length} / active {activationTrace.filter((item) => item.activated).length}
        </div>
        {activationTrace.map((item) => (
          <div key={`${item.role}-${item.source}`} className="trace-event__artifact">
            {item.role}: {item.status} / source: {item.source}
          </div>
        ))}
      </article>

      <div className="trace-list">
        {report.roles.map((role) => (
          <article key={role.role} className="trace-event">
            <div className="trace-event__kind">{role.role}</div>
            <div className="trace-event__detail">{role.summary}</div>
            {role.issues.length === 0 ? (
              <div className="trace-event__meta">No issues recorded for this review role.</div>
            ) : (
              <div className="review-issues">
                {role.issues.map((issue) => (
                  <div
                    key={`${role.role}-${issue.title}`}
                    className={`trace-event trace-event--${toIssueTone(issue.decision)}`}
                  >
                    <div className="trace-event__kind">{issue.decision}</div>
                    <div className="trace-event__detail">{issue.title}</div>
                    <div className="trace-event__meta">{issue.description}</div>
                    <div className="trace-event__artifact">impact: {issue.impact}</div>
                    <div className="trace-event__artifact">recommendation: {issue.recommendation}</div>
                    <div className="trace-event__artifact">expected answer: {issue.expectedAnswer}</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
