import type { WorkflowTask } from '../../shared/schemas';

type Props = {
  tasks: WorkflowTask[];
};

const statusLabels: Record<WorkflowTask['status'], string> = {
  pending: '待开始',
  active: '进行中',
  completed: '已完成',
  blocked: '已阻塞',
};

export function TaskQueuePanel({ tasks }: Props) {
  if (tasks.length === 0) {
    return <p>暂无任务队列。</p>;
  }

  return (
    <div className="artifact-list">
      {tasks.map((task) => (
        <article key={task.id} className={`artifact-card stage-${task.status}`}>
          <div className="artifact-meta">
            <strong>{task.title}</strong>
            <span>{task.ownerRole}</span>
            <span>{statusLabels[task.status]}</span>
          </div>
          <p>{task.description}</p>
          <ul>
            {task.acceptanceCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {task.artifactPaths.length > 0 ? (
            <ul>
              {task.artifactPaths.map((path) => (
                <li key={path}>
                  <code>{path}</code>
                </li>
              ))}
            </ul>
          ) : null}
          {task.blockedReason ? <p>阻塞原因：{task.blockedReason}</p> : null}
        </article>
      ))}
    </div>
  );
}
