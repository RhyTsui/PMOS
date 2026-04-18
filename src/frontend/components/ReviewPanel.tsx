import type { CommitteeReport } from '../../shared/schemas';

type Props = {
  report: CommitteeReport;
};

export function ReviewPanel({ report }: Props) {
  return (
    <div className="review-panel">
      <div className="review-summary">
        <strong>{report.overallConclusion}</strong>
        <span>进入下一阶段：{report.nextStage ? '是' : '否'}</span>
        <span>是否返工：{report.reworkRequired ? '需要' : '不需要'}</span>
      </div>
      {report.roles.map((role) => (
        <article key={role.role} className="review-role">
          <h3>{role.role}</h3>
          <p>{role.summary}</p>
          {role.issues.length > 0 ? (
            <ul>
              {role.issues.map((issue) => (
                <li key={`${role.role}-${issue.title}`}>
                  <strong>{issue.title}</strong>
                  <p>{issue.description}</p>
                  <p>影响：{issue.impact}</p>
                  <p>建议：{issue.recommendation}</p>
                  <p>标准答案：{issue.expectedAnswer}</p>
                  <p>结论：{issue.decision}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>暂无问题。</p>
          )}
        </article>
      ))}
    </div>
  );
}
