import { useState } from "react";
import { useContent } from "@/lib/api";
import { PageSkeleton, LoadError, VTag, SectionHead, copyText } from "@/components/Primitives";
import { useToast } from "@/components/Toast";
import type { VendorId } from "@shared/schema";

function CopyBtn({ text, label = "Copy", testid }: { text: string; label?: string; testid?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <button className={`copy-btn ${done ? "done" : ""}`} data-testid={testid} aria-label={`${label} to clipboard`}
      onClick={async () => { const ok = await copyText(text); if (ok) { setDone(true); setTimeout(() => setDone(false), 1600); } else toast("Clipboard blocked", "Select the text and copy manually.", "error"); }}>
      {done ? "Copied" : label}
    </button>
  );
}

export default function Battlecards() {
  const q = useContent();
  const [active, setActive] = useState<VendorId>("jasper");
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <LoadError error={q.error} retry={() => q.refetch()} />;
  const { battlecards, narrative, vendors } = q.data;
  const V = Object.fromEntries(vendors.map((v) => [v.id, v])) as Record<VendorId, (typeof vendors)[number]>;
  const b = battlecards.find((x) => x.vs === active) ?? battlecards[0];
  const them = V[b.vs];

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Layer 04 <span className="muted">/ Battlecards</span></div>
        <h1 className="page-title">Head-to-head, with the questions that end the evaluation</h1>
        <p className="lede">One card per rival: where MARK wins, the strength you must counter, three landmine questions to ask prospects, and the vulnerabilities to exploit.</p>
      </header>

      <section aria-label="Battlecards">
        <div className="tabs" role="tablist">
          {battlecards.map((c) => (
            <button key={c.vs} className="tab" role="tab" aria-selected={c.vs === b.vs} onClick={() => setActive(c.vs)} data-testid={`tab-${c.vs}`}><span className="prefix">MARK vs.</span><VTag id={c.vs} label={V[c.vs].name} /></button>
          ))}
        </div>
        <div className="bc" role="tabpanel" key={b.vs} data-testid={`battlecard-${b.vs}`}>
          <div className="bc-grid">
            <div className="card flush vs-wrap">
              <table className="vs-table">
                <thead><tr><th>Dimension</th><th><VTag id="mark" label="MARK advantage" /></th><th><VTag id={b.vs} label={`${them.short} advantage`} /></th></tr></thead>
                <tbody>{b.rows.map((r) => <tr key={r.dim}><td className="dim">{r.dim}</td><td className="mk">{r.mark}</td><td>{r.them}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="stack">
              <div className="callout"><div className="eyebrow">Strength to counter</div><p>{b.counter}</p></div>
              <div className="card" style={{ display: "grid", gap: "var(--space-4)" }}>
                <div className="section-head" style={{ margin: 0 }}><div className="card-title">Landmine questions</div><CopyBtn label="Copy all" text={b.landmines.map((x, i) => `${i + 1}. ${x}`).join("\n")} testid={`button-copy-all-${b.vs}`} /></div>
                <div className="landmines">{b.landmines.map((x, i) => <div key={x} className="landmine" data-testid={`landmine-${b.vs}-${i}`}><q>{x}</q><CopyBtn text={x} /></div>)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="section-head" style={{ marginBottom: "var(--space-4)" }}><div className="card-title">{them.name} vulnerabilities to exploit</div><a className="source-link" href={b.weaknessHref} target="_blank" rel="noopener noreferrer">Source</a></div>
            <ul className="weak" style={{ columns: b.weaknesses.length > 4 ? 2 : 1, columnGap: "var(--space-8)" }}>{b.weaknesses.map((w) => <li key={w}><span>{w}</span></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead title="Narrative teardown" note="Every vendor tells a villain–hero–transformation story. Here they are side by side." />
        <div className="table-wrap">
          <table className="cmp narr" data-testid="table-narrative">
            <thead><tr><th>Element</th>{vendors.map((v) => <th key={v.id} className={v.id === "mark" ? "mark-col" : ""}><VTag id={v.id} label={v.name} /></th>)}</tr></thead>
            <tbody>{narrative.map((r) => <tr key={r.el}><td className="dim">{r.el}</td>{vendors.map((v) => <td key={v.id} className={v.id === "mark" ? "mark-col" : ""}>{r[v.id]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
