import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useContent } from "@/lib/api";
import { LAYERS, type Layer } from "@/lib/layers";
import { SearchIcon } from "./Primitives";
import type { ContentBundle } from "@shared/schema";

interface Item { layer: Layer; title: string; snippet: string; key: string }

function buildIndex(c: ContentBundle): Item[] {
  const out: Item[] = [];
  const L = (i: number) => LAYERS[i];
  const V = Object.fromEntries(c.vendors.map((v) => [v.id, v]));
  const add = (layer: Layer, title: string, snippet: string) => out.push({ layer, title, snippet, key: (title + " " + snippet).toLowerCase() });
  c.summary.kpis.forEach((k) => add(L(0), k.label, k.note));
  c.vendors.forEach((v) => add(L(0), v.name, v.tagline));
  c.summary.proof.forEach((p) => add(L(0), `${p.industry} case study`, `${p.stat} ${p.desc}`));
  c.pricing.rows.forEach((r) => add(L(1), `Pricing · ${r.dim}`, `MARK: ${r.mark} · Jasper: ${r.jasper} · HubSpot: ${r.hubspot} · Salesforce: ${r.salesforce}`));
  c.pricing.analysis.forEach((a) => add(L(1), `Pricing analysis · ${V[a.vendor].name}`, a.text));
  c.features.capabilities.forEach((x) => add(L(2), `Capability · ${x.name}`, `MARK: ${x.mark} · Jasper: ${x.jasper} · HubSpot: ${x.hubspot} · Salesforce: ${x.salesforce}`));
  c.features.leads.forEach((l) => add(L(2), "Where MARK leads", l));
  c.battlecards.forEach((b) => {
    b.landmines.forEach((q) => add(L(3), `Landmine · vs. ${V[b.vs].short}`, q));
    b.weaknesses.forEach((w) => add(L(3), `${V[b.vs].name} weakness`, w));
    b.rows.forEach((r) => add(L(3), `vs. ${V[b.vs].short} · ${r.dim}`, `${r.mark} / ${r.them}`));
  });
  c.narrative.forEach((n) => add(L(3), `Narrative · ${n.el}`, `${n.mark} · ${n.jasper} · ${n.hubspot} · ${n.salesforce}`));
  c.playbook.actions.forEach((a) => add(L(4), `Action ${a.n} · ${a.title}`, a.body));
  c.playbook.reviewPhases.forEach((p) => add(L(4), `${p.phase} · ${p.title}`, p.steps.join(" ")));
  add(L(4), "Positioning statement", c.playbook.positioning);
  return out;
}

function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { data } = useContent();
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => (data ? buildIndex(data) : []), [data]);
  const query = q.trim().toLowerCase();
  const items = useMemo(() => (query ? index.filter((it) => it.key.includes(query)) : index.slice(0, 8)).slice(0, 12), [index, query]);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [query]);

  const go = (i: number) => { const it = items[i]; if (!it) return; onClose(); navigate(it.layer.path); };

  return (
    <div className="palette" data-open="true" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette-box">
        <div className="palette-input">
          <SearchIcon />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pricing, capabilities, landmines, actions…" autoComplete="off" data-testid="input-search"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); go(sel); }
            }} />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" role="listbox">
          {items.length === 0 ? (
            <div className="palette-empty">Nothing matches “{q}”.</div>
          ) : items.map((it, i) => (
            <button key={it.key + i} className="palette-item" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>
              <span><span className="pt" style={{ display: "block" }}><Hl text={it.title} q={query} /></span><span className="ps"><Hl text={it.snippet} q={query} /></span></span>
              <span className="pl">Layer {it.layer.n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
