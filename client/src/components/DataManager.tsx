import { useEffect, useMemo, useState } from "react";
import { useContent, useSaveSection, useResetSections, errorMessage, exportUrl } from "@/lib/api";
import { useToast } from "./Toast";
import { fmtDate } from "@/lib/format";
import { contentKeys, type ContentKey } from "@shared/schema";

const LABELS: Record<ContentKey, string> = {
  meta: "Meta", vendors: "Vendors", summary: "Summary & KPIs", pricing: "Pricing & cost model", features: "Capabilities",
  narrative: "Narrative", battlecards: "Battlecards", playbook: "Playbook", sources: "Sources",
};

export function DataManager({ onClose }: { onClose: () => void }) {
  const { data } = useContent();
  const save = useSaveSection();
  const reset = useResetSections();
  const toast = useToast();
  const [key, setKey] = useState<ContentKey>("pricing");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const original = useMemo(() => (data ? JSON.stringify(data[key], null, 2) : ""), [data, key]);
  useEffect(() => { setText(original); setErr(null); }, [original]);
  const dirty = text !== original;

  const onSave = async () => {
    let value: unknown;
    try { value = JSON.parse(text); } catch (e) { setErr(`Invalid JSON: ${(e as Error).message}`); return; }
    try {
      await save.mutateAsync({ key, value });
      setErr(null);
      toast("Section saved", `${LABELS[key]} updated for everyone.`, "success");
    } catch (e) { setErr(errorMessage(e)); }
  };

  const onReset = async () => {
    try { await reset.mutateAsync([key]); toast("Section restored", `${LABELS[key]} reset to the April 7 teardown.`, "success"); }
    catch (e) { toast("Reset failed", errorMessage(e), "error"); }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Manage teardown data" data-testid="modal-data">
        <div className="modal-head">
          <div><div className="eyebrow" style={{ marginBottom: 4 }}>Data manager</div><h2>Edit teardown content</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <nav className="section-list" aria-label="Sections">
            {contentKeys.map((k) => (
              <button key={k} onClick={() => { if (dirty) { setErr("Save or discard your changes before switching sections."); return; } setKey(k); }} aria-current={k === key}>
                <span>{LABELS[k]}</span>
                {data && <span className="ts">{fmtDate(data.updatedAt[k])}</span>}
              </button>
            ))}
          </nav>
          <div className="field">
            <label htmlFor="json-editor">{LABELS[key]} · JSON (validated on save)</label>
            <textarea id="json-editor" className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} data-testid="input-json" />
            {err ? <div className="error-text" role="alert">{err}</div> : <div className="help">Schema-checked server-side. Changes are live for every viewer immediately.</div>}
          </div>
        </div>
        <div className="modal-foot">
          <div className="btn-row">
            <a className="btn sm" href={exportUrl("teardown.json")} target="_blank" rel="noopener noreferrer">Export everything (JSON)</a>
            <a className="btn sm" href={exportUrl("pricing.csv")} target="_blank" rel="noopener noreferrer">Pricing CSV</a>
            <a className="btn sm" href={exportUrl("capabilities.csv")} target="_blank" rel="noopener noreferrer">Capabilities CSV</a>
          </div>
          <div className="btn-row">
            <button className="btn danger" onClick={onReset} disabled={reset.isPending}>Restore original</button>
            <button className="btn" onClick={() => setText(original)} disabled={!dirty}>Discard</button>
            <button className="btn primary" onClick={onSave} disabled={!dirty || save.isPending} data-testid="button-json-save">{save.isPending ? "Saving…" : "Save section"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
