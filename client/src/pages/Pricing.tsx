import { useMemo, useState } from "react";
import { useContent, useScenarios, useCreateScenario, useDeleteScenario, errorMessage, exportUrl } from "@/lib/api";
import { PageSkeleton, LoadError, VTag, SectionHead, Ext } from "@/components/Primitives";
import { useToast } from "@/components/Toast";
import { fmtUsd, fmtInt, fmtDate } from "@/lib/format";
import { computeCosts, type CostInputs, type VendorId } from "@shared/schema";

const DEFAULTS: CostInputs = { seats: 5, contacts: 10000, convos: 1500 };

function Slider({ id, label, min, max, step, value, help, display, onChange }: { id: keyof CostInputs; label: string; min: number; max: number; step: number; value: number; help: string; display: string; onChange: (v: number) => void }) {
  return (
    <div className="control">
      <div className="control-head"><label htmlFor={`ctl-${id}`}>{label}</label><output htmlFor={`ctl-${id}`}>{display}</output></div>
      <input type="range" id={`ctl-${id}`} min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} data-testid={`input-${id}`} aria-valuetext={display} />
      <small>{help}</small>
    </div>
  );
}

export default function Pricing() {
  const q = useContent();
  const scenarios = useScenarios();
  const create = useCreateScenario();
  const remove = useDeleteScenario();
  const toast = useToast();
  const [m, setM] = useState<CostInputs>(DEFAULTS);
  const [name, setName] = useState("");

  const costs = useMemo(() => (q.data ? computeCosts(q.data.pricing.model, m) : []), [q.data, m]);
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <LoadError error={q.error} retry={() => q.refetch()} />;
  const { pricing: P, vendors } = q.data;
  const V = Object.fromEntries(vendors.map((v) => [v.id, v])) as Record<VendorId, (typeof vendors)[number]>;
  const max = Math.max(...costs.map((c) => c.annual));
  const [mark, jasper, hubspot, salesforce] = costs.map((c) => c.annual);
  const pct = (a: number, b: number) => Math.round(((a - b) / a) * 100);
  const mm = P.model;

  const saveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await create.mutateAsync({ name: name.trim() || `Scenario ${fmtDate(Date.now())}`, ...m }); setName(""); toast("Scenario saved", "Available to everyone viewing this teardown.", "success"); }
    catch (err) { toast("Couldn’t save scenario", errorMessage(err), "error"); }
  };

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Layer 02 <span className="muted">/ Pricing</span></div>
        <h1 className="page-title">A flat fee against three moving targets</h1>
        <p className="lede">MARK charges one number. Jasper meters seats, HubSpot meters contacts and tiers, Salesforce meters conversations. Model a first year below, save scenarios for your team, then read the tier detail.</p>
      </header>

      <section className="card flush" aria-label="Year-one cost model">
        <div className="modeler">
          <div className="modeler-controls">
            <div><div className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>Cost model</div><div className="card-title">Year-one spend, modeled from listed prices</div></div>
            <Slider id="seats" label="Marketing seats" min={1} max={25} step={1} value={m.seats} display={String(m.seats)} help="Jasper and Salesforce bill per user" onChange={(v) => setM({ ...m, seats: v })} />
            <Slider id="contacts" label="Marketing contacts" min={1000} max={50000} step={1000} value={m.contacts} display={fmtInt(m.contacts)} help={`HubSpot Pro includes ${fmtInt(mm.hubspotIncludedContacts)}; +$${mm.hubspotContactBlockMonthlyUsd}/mo per ${fmtInt(mm.hubspotContactBlock)}`} onChange={(v) => setM({ ...m, contacts: v })} />
            <Slider id="convos" label="AI conversations / month" min={0} max={5000} step={100} value={m.convos} display={fmtInt(m.convos)} help={`Agentforce bills $${mm.salesforcePerConversationUsd} per conversation`} onChange={(v) => setM({ ...m, convos: v })} />
            <form className="scenario-form" onSubmit={saveScenario}>
              <input className="input" placeholder="Name this scenario…" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="input-scenario-name" />
              <button className="btn primary" type="submit" disabled={create.isPending} data-testid="button-scenario-save">Save</button>
            </form>
          </div>
          <div className="modeler-out">
            <div className="cost-rows">
              {costs.map((c) => (
                <div key={c.id} className={`cost-row v-${c.id}`} data-testid={`cost-${c.id}`}>
                  <VTag id={c.id} label={V[c.id].short} />
                  <div className="bar"><i style={{ width: `${(c.annual / max) * 100}%` }} /></div>
                  <div className="amt">{fmtUsd(c.annual)}<small>{fmtUsd(c.monthly)} / mo</small></div>
                </div>
              ))}
            </div>
            <div className="hairline" />
            <div className="delta" data-testid="cost-delta">
              MARK {hubspot > mark ? <>saves <b>{pct(hubspot, mark)}%</b> vs. HubSpot</> : <>costs <b className="neg">{pct(mark, hubspot)}%</b> more than HubSpot</>} and {salesforce > mark ? <><b>{pct(salesforce, mark)}%</b> vs. Salesforce</> : <><b className="neg">{pct(mark, salesforce)}%</b> more than Salesforce</>}.{" "}
              {jasper < mark ? <>Jasper is <b>{pct(mark, jasper)}%</b> cheaper, but content-only.</> : <>Jasper costs <b>{pct(jasper, mark)}%</b> more.</>}
            </div>
            <ul className="assump">
              <li>MARK: €750/mo Team plan ≈ ${mm.markMonthlyUsd}/mo, flat, no onboarding fee.</li>
              <li>Jasper: ${mm.jasperSeatMonthlyUsd}/user/mo on annual billing (Pro). Business plan is custom and excluded.</li>
              <li>HubSpot: Marketing Hub Professional ${mm.hubspotBaseMonthlyUsd}/mo ({fmtInt(mm.hubspotIncludedContacts)} contacts) + ${mm.hubspotContactBlockMonthlyUsd}/mo per {fmtInt(mm.hubspotContactBlock)} extra + ${fmtInt(mm.hubspotOnboardingUsd)} onboarding. Extra seats not modeled.</li>
              <li>Salesforce: ${mm.salesforcePerConversationUsd} per conversation + ${mm.salesforceSeatMonthlyUsd}/user/mo license. Foundations tier is $0; implementation excluded.</li>
              <li>Estimates only. Figures come from the teardown; confirm with each vendor. Model constants are editable in the data manager.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead title="Saved scenarios" right={<div className="btn-row"><a className="btn sm" href={exportUrl("scenarios.csv")} target="_blank" rel="noopener noreferrer" data-testid="link-export-scenarios">Export CSV</a></div>} />
        {scenarios.isLoading && <div className="skel" style={{ height: 56 }} />}
        {scenarios.isError && <div className="empty">Scenarios are unavailable while the API is offline.</div>}
        {scenarios.data && scenarios.data.length === 0 && <div className="empty">No saved scenarios. Set the sliders above and save one for your team.</div>}
        {scenarios.data && scenarios.data.length > 0 && (
          <div className="scenarios">
            {scenarios.data.map((s) => {
              const c = computeCosts(P.model, s);
              return (
                <div key={s.id} className="scenario-row" data-testid={`scenario-${s.id}`}>
                  <div><div className="sn">{s.name}</div><div className="sm-meta">{s.seats} seats · {fmtInt(s.contacts)} contacts · {fmtInt(s.convos)} conv/mo · MARK {fmtUsd(c[0].annual)} vs HubSpot {fmtUsd(c[2].annual)} · {fmtDate(s.createdAt)}</div></div>
                  <button className="btn sm" onClick={() => setM({ seats: s.seats, contacts: s.contacts, convos: s.convos })}>Load</button>
                  <button className="btn sm danger" onClick={() => remove.mutate(s.id, { onError: (e) => toast("Couldn’t delete", errorMessage(e), "error") })} aria-label={`Delete ${s.name}`}>Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <SectionHead title="Tier-by-tier comparison" right={<div className="btn-row"><span className="section-note">MARK’s column is highlighted.</span><a className="btn sm" href={exportUrl("pricing.csv")} target="_blank" rel="noopener noreferrer" data-testid="link-export-pricing">Export CSV</a></div>} />
        <div className="table-wrap">
          <table className="cmp" data-testid="table-pricing">
            <thead><tr><th>Dimension</th>{vendors.map((v) => <th key={v.id} className={v.id === "mark" ? "mark-col" : ""}><VTag id={v.id} label={v.name} /></th>)}</tr></thead>
            <tbody>{P.rows.map((r) => <tr key={r.dim}><td className="dim">{r.dim}</td>{vendors.map((v) => <td key={v.id} className={v.id === "mark" ? "mark-col" : ""}>{r[v.id]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <SectionHead title="Pricing analysis" />
        <div className="analysis">{P.analysis.map((a) => <div key={a.vendor} className="card"><VTag id={a.vendor} label={V[a.vendor].name} /><p>{a.text}</p></div>)}</div>
      </section>

      <section className="section">
        <SectionHead title="Pricing sources" />
        <div className="links">{P.sources.map((s) => <Ext key={s.href} href={s.href} label={s.label} />)}</div>
      </section>
    </>
  );
}
