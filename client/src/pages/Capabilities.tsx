import { useEffect, useState } from "react";
import { useContent, exportUrl } from "@/lib/api";
import { PageSkeleton, LoadError, VTag, SectionHead } from "@/components/Primitives";
import { RadarChart } from "@/components/RadarChart";
import { slug } from "@/lib/format";
import type { VendorId } from "@shared/schema";

type Filter = "all" | "leads" | "contested" | "gaps";
const FILTERS: [Filter, string][] = [["all", "All capabilities"], ["leads", "MARK leads outright"], ["contested", "Contested"], ["gaps", "MARK gaps"]];

export default function Capabilities() {
  const q = useContent();
  const [visible, setVisible] = useState<Record<string, boolean>>({ mark: true, jasper: true, hubspot: true, salesforce: true });
  const [filter, setFilter] = useState<Filter>("all");
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setAnimated(true)); return () => cancelAnimationFrame(t); }, []);

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <LoadError error={q.error} retry={() => q.refetch()} />;
  const { features: F, vendors } = q.data;
  const V = Object.fromEntries(vendors.map((v) => [v.id, v])) as Record<VendorId, (typeof vendors)[number]>;
  const totals = vendors.map((v, i) => ({ id: v.id, sum: F.capabilities.reduce((a, c) => a + c.scores[i], 0), max: F.capabilities.length * 3 })).sort((a, b) => b.sum - a.sum);
  const rows = F.capabilities.filter((c) => {
    const [m, ...o] = c.scores; const best = Math.max(...o);
    return filter === "leads" ? m > best : filter === "contested" ? m === best : filter === "gaps" ? m < best : true;
  });

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Layer 03 <span className="muted">/ Capabilities</span></div>
        <h1 className="page-title">Breadth is the moat. Depth is the exposure.</h1>
        <p className="lede">Eleven capabilities scored 0–3 from the feature matrix. MARK covers more surface than any rival; competitors go deeper in the one place each was built for.</p>
      </header>

      <section className="split">
        <div className="card flush">
          <div className="legend" role="group" aria-label="Toggle vendors">
            {vendors.map((v) => (
              <button key={v.id} className={`filter v-${v.id}`} aria-pressed={!!visible[v.id]} onClick={() => setVisible({ ...visible, [v.id]: !visible[v.id] })} data-testid={`toggle-${v.id}`}><i className="vdot" />{v.name}</button>
            ))}
          </div>
          <div className="radar-wrap"><RadarChart features={F} vendors={vendors} visible={visible} /></div>
        </div>
        <div className="card flush" style={{ display: "grid", alignContent: "space-between" }}>
          <div className="coverage">
            <div><div className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>Coverage index</div><div className="card-title">Share of maximum possible score</div></div>
            {totals.map((t) => (
              <div key={t.id} className={`cov-row v-${t.id}`} data-testid={`coverage-${t.id}`}>
                <VTag id={t.id} label={V[t.id].name} />
                <div className="bar"><i style={{ width: animated ? `${(t.sum / t.max) * 100}%` : 0 }} /></div>
                <div className="pct">{Math.round((t.sum / t.max) * 100)}%</div>
              </div>
            ))}
          </div>
          <p className="cov-foot">Analyst scoring: 3 = core, autonomous capability · 2 = present with limits · 1 = ancillary · 0 = absent. Derived from the teardown feature matrix.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Capability matrix</h2>
          <div className="filters">
            {FILTERS.map(([k, l]) => <button key={k} className="filter" aria-pressed={filter === k} onClick={() => setFilter(k)} data-testid={`filter-${k}`}>{l}</button>)}
            <a className="btn sm" href={exportUrl("capabilities.csv")} target="_blank" rel="noopener noreferrer" data-testid="link-export-capabilities">Export CSV</a>
          </div>
        </div>
        <div className="table-wrap">
          <table className="cmp" data-testid="table-capabilities">
            <thead><tr><th>Capability</th>{vendors.map((v) => <th key={v.id} className={v.id === "mark" ? "mark-col" : ""}><VTag id={v.id} label={v.name} /></th>)}</tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", padding: "var(--space-10)" }}>No capabilities in this view.</td></tr> : rows.map((c) => (
                <tr key={c.name} data-testid={`row-cap-${slug(c.name)}`}>
                  <td className="dim">{c.name}</td>
                  {vendors.map((v, i) => (
                    <td key={v.id} className={v.id === "mark" ? "mark-col" : ""}>
                      <div className={`score v-${v.id}`} aria-label={`Score ${c.scores[i]} of 3`}>{[0, 1, 2].map((k) => <i key={k} className={k < c.scores[i] ? "on" : ""} />)}</div>
                      {c[v.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <SectionHead title="Where the edge sits" />
        <div className="leads">
          <div className="card"><div className="eyebrow" style={{ marginBottom: "var(--space-4)" }}>Where MARK leads</div><ol className="leadlist">{F.leads.map((l) => <li key={l}><span>{l}</span></li>)}</ol></div>
          <div className="theirs">{F.theirs.map((t) => <div key={t.vendor} className="card"><VTag id={t.vendor} label={`${V[t.vendor].name} leads on`} /><p>{t.text}</p></div>)}</div>
        </div>
      </section>
    </>
  );
}
