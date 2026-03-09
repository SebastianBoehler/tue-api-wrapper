export function ErrorPanel({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="panel error-panel">
      <p className="eyebrow">Live data required</p>
      <h3>{title}</h3>
      <p>{message}</p>
    </section>
  );
}
