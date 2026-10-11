import { useContent } from "@/lib/api";
import { PageSkeleton, LoadError, VTag, SectionHead } from "@/components/Primitives";
import { PositioningMap } from "@/components/PositioningMap";
import { Counter } from "@/components/Counter";
import { slug } from "@/lib/format";

export default function Overview() {
  const q = useContent();
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <LoadError error={q.error} retry={() => q.refetch()} />;
  const { summary: S, vendors, meta } = q.data;

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Layer 01 <span className="muted">/ Executive summary · {meta.prepared}</span></div>
        <h1 className="hero-title">Six engines. One flat price. <em>Zero reviews.</em></h1>
        <p className="lede">{S.lede}</p>
        <p className="lede"><strong>{S.thesis}</strong></p>
      </header>

      <section className="kpis" aria-label="Key figures">
        {S.kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.tone === "warn" ? "warn" : ""}`} data-testid={`kpi-${slug(k.label)}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.prefix && <span className="u">{k.prefix}</span>}<Counter value={k.value} />{k.suffix && <span className="u">{k.suffix}</span>}</div>
            <div className="kpi-note">{k.href ? <a href={k.href} target="_blank" rel="noopener noreferrer">{k.note}</a> : k.note}</div>
          </div>
        ))}
      </section>

      <section className="section">
        <SectionHead title="Positioning map" note="Autonomy against platform breadth. MARK is alone in the upper-left: most autonomous, still a point solution." />
        <div className="split">
          <div className="card"><PositioningMap points={S.positioning} vendors={vendors} /></div>
          <div className="card" style={{ display: "grid", alignContent: "center" }}>
            <div className="notes">{S.positioningNotes.map((n) => <div key={n} className="note"><span>{n}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead title="The four contenders" note="Each attacks the category from a different angle." />
        <div className="contenders">
          {vendors.map((v, i) => (
            <a key={v.id} className={`card contender ${i === 0 ? "primary" : ""}`} href={v.url} target="_blank" rel="noopener noreferrer" data-testid={`card-vendor-${v.id}`}>
              <VTag id={v.id} label={v.org} />
              <div className="cname">{v.name}</div>
              <p>{v.tagline}</p>
              <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHead title="Proof on the table" note={<>Four anonymized enterprise case studies and five compliance claims. <a className="source-link" href={S.proofHref} target="_blank" rel="noopener noreferrer">AIMatric case studies</a> · <a className="source-link" href={S.complianceHref} target="_blank" rel="noopener noreferrer">Services page</a></>} />
        <div className="proof">
          {S.proof.map((p) => <div key={p.industry} className="proof-item"><span className="pi">{p.industry}</span><span className="ps">{p.stat}</span><span className="pd">{p.desc}</span></div>)}
        </div>
        <div className="chips" style={{ marginTop: "var(--space-8)" }}>{S.compliance.map((c) => <span key={c} className="chip">{c}</span>)}</div>
      </section>
    </>
  );
}
