import { useIndex } from "../api.ts";
import { Badge, Failure, Loading } from "../components/Bits.tsx";
import { href } from "../router.ts";

export function Home() {
  const index = useIndex();
  if (index.status === "loading") return <Loading />;
  if (index.status === "error") return <Failure message={index.message} />;
  const { datasets, packets } = index.value;
  return (
    <div className="page">
      <section className="intro">
        <h1>What changes when an agent receives these skills?</h1>
        <p>
          Each case runs twice with the same prompt, host, model settings, tools, and inputs. One run also receives the
          skill's files; the other has only the host's own instructions. Compare what each actually produced: answers,
          workspace changes, and checks the harness executed afterwards.
        </p>
      </section>

      <section>
        <h2>Comparisons</h2>
        <div className="cards">
          {datasets.map((dataset) => (
            <a key={dataset.id} className="card link-card" href={href.dataset(dataset.id)}>
              <div className="card-head">
                <Badge tone={dataset.kind === "historical" ? "info" : "neutral"}>{dataset.kind === "historical" ? "Historical" : "Batch"}</Badge>
                <span className="muted small">{dataset.runs} runs</span>
              </div>
              <h3>{dataset.title}</h3>
              <code className="muted small">{dataset.id}</code>
            </a>
          ))}
          {!datasets.length && <p className="muted">No reviewed datasets have been published yet.</p>}
        </div>
      </section>

      <section>
        <h2>Human calibration</h2>
        <p className="muted">
          Condition-masked A/B packets. Judgments are saved as drafts in this browser only; export them explicitly.
        </p>
        <div className="cards">
          {packets.map((packet) => (
            <a key={packet.id} className="card link-card" href={href.packet(packet.id)}>
              <div className="card-head">
                <Badge tone="neutral">{packet.items} items</Badge>
                <code className="muted small">{packet.sha256.slice(0, 12)}</code>
              </div>
              <h3>{packet.title}</h3>
              <code className="muted small">{packet.id}</code>
            </a>
          ))}
          {!packets.length && <p className="muted">No calibration packets yet.</p>}
        </div>
      </section>
    </div>
  );
}
