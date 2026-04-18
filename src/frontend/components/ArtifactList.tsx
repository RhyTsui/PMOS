type ArtifactWithContent = {
  id: string;
  title: string;
  path: string;
  stage: string;
  type: string;
  content: string;
};

type Props = {
  artifacts: ArtifactWithContent[];
};

export function ArtifactList({ artifacts }: Props) {
  if (artifacts.length === 0) {
    return <p>暂无产物。</p>;
  }

  return (
    <div className="artifact-list">
      {artifacts.map((artifact) => (
        <article key={artifact.id} className="artifact-card">
          <div className="artifact-meta">
            <strong>{artifact.title}</strong>
            <span>{artifact.stage}</span>
            <code>{artifact.path}</code>
          </div>
          <pre>{artifact.content.slice(0, 900)}</pre>
        </article>
      ))}
    </div>
  );
}
