import { useState } from "react";
import { useContent, useTasks, useUpdateTask, errorMessage } from "@/lib/api";
import { PageSkeleton, LoadError, VTag, SectionHead, Ext, Chevron } from "@/components/Primitives";
import { useToast } from "@/components/Toast";
import { pad2, slug } from "@/lib/format";
import type { Task, TaskStatus, VendorId } from "@shared/schema";

const STATUS: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

function Tracker({ task }: { task: Task | undefined }) {
  const update = useUpdateTask();
  const toast = useToast();
  const [owner, setOwner] = useState(task?.owner ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  if (!task) return <div className="help">Tracker unavailable while the API is offline.</div>;
  const patch = (p: Partial<Pick<Task, "status" | "owner" | "note">>) => update.mutate({ id: task.id, patch: p as { status?: TaskStatus; owner?: string; note?: string } }, { onError: (e) => toast("Couldn’t update", errorMessage(e), "error") });
  return (
    <div className="tracker" data-testid={`tracker-${task.id}`}>
      <div className="field">
        <label htmlFor={`st-${task.id}`}>Status</label>
        <select id={`st-${task.id}`} className="select" value={task.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })} data-testid={`select-status-${task.id}`}>
          {(Object.keys(STATUS) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <div className="field">
          <label htmlFor={`ow-${task.id}`}>Owner</label>
          <input id={`ow-${task.id}`} className="input" placeholder="Who owns this?" value={owner} maxLength={80} onChange={(e) => setOwner(e.target.value)} onBlur={() => owner !== task.owner && patch({ owner: owner.trim() })} data-testid={`input-owner-${task.id}`} />
        </div>
        <div className="field">
          <label htmlFor={`nt-${task.id}`}>Progress note</label>
          <textarea id={`nt-${task.id}`} className="textarea" style={{ minHeight: 64 }} placeholder="What’s the latest?" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== task.note && patch({ note: note.trim() })} />
          <span className="help">Saved automatically when you leave the field.</span>
        </div>
      </div>
    </div>
  );
}

export default function Playbook() {
  const q = useContent();
  const tasks = useTasks();
  const updateTask = useUpdateTask();
  const toast = useToast();
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <LoadError error={q.error} retry={() => q.refetch()} />;
  const { playbook: P, vendors, sources } = q.data;
  const V = Object.fromEntries(vendors.map((v) => [v.id, v])) as Record<VendorId, (typeof vendors)[number]>;
  const T = Object.fromEntries((tasks.data ?? []).map((t) => [t.id, t]));
  const actionTasks = P.actions.map((a) => T[`action-${a.n}`]).filter(Boolean) as Task[];
  const done = actionTasks.filter((t) => t.status === "done").length;
  const parts = P.positioning.split("only autonomous AI marketing agent");

  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Layer 05 <span className="muted">/ Playbook</span></div>
        <h1 className="page-title">Own a category none of them can claim</h1>
        <p className="lede">The positioning statement, the category to create, five prioritized actions with a live tracker, and a four-phase plan to close the review gap.</p>
      </header>

      <section className="card statement" aria-label="Positioning statement">
        <div className="eyebrow">Positioning statement</div>
        <blockquote>{parts.length === 2 ? <>{parts[0]}<em>only autonomous AI marketing agent</em>{parts[1]}</> : P.positioning}</blockquote>
      </section>

      <section className="section">
        <SectionHead title="Category strategy" note={P.category.recommendation} />
        <div className="card own">
          {P.category.owned.map((o) => <div key={o.vendor} className={`own-row ${o.target ? "target" : ""}`}><VTag id={o.vendor} label={V[o.vendor].name} /><span className="owns">{o.owns}</span></div>)}
        </div>
      </section>

      <section className="section">
        <SectionHead title="Top five actions" right={
          <div className="progress-line" style={{ minWidth: 260 }}>
            <div className="bar"><i style={{ width: `${actionTasks.length ? (done / actionTasks.length) * 100 : 0}%` }} /></div>
            <span className="lbl" data-testid="text-actions-progress">{done}/{P.actions.length} done</span>
          </div>} />
        <div className="actions">
          {P.actions.map((a) => {
            const t = T[`action-${a.n}`];
            return (
              <details key={a.n} className="action" open={a.n === 1} data-testid={`action-${a.n}`}>
                <summary>
                  <span className="an">{pad2(a.n)}</span>
                  <span className="at">{a.title}</span>
                  <span className="badges"><span className={`badge ${a.impact === "High" ? "hi" : ""}`}>Impact {a.impact}</span><span className="badge">Effort {a.effort}</span>{t && <span className={`status-pill ${t.status}`}>{STATUS[t.status as TaskStatus]}</span>}</span>
                  <Chevron />
                </summary>
                <div className="action-body">
                  <p>{a.body}</p>
                  {a.links.length > 0 && <div className="links">{a.links.map((l) => <Ext key={l.href} href={l.href} label={l.label} />)}</div>}
                  <Tracker key={t?.id + (t?.updatedAt ?? "")} task={t} />
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SectionHead title="G2 & Capterra review playbook" note="From zero to 50+ reviews in six months, the single fastest trust repair available." />
        <div className="phases">
          {P.reviewPhases.map((p, i) => {
            const t = T[`phase-${i + 1}`];
            return (
              <div key={p.phase} className="phase" data-testid={`phase-${slug(p.phase)}`}>
                <div className="ph"><span>{p.phase}</span><span>{p.window}</span></div>
                <h3>{p.title}</h3>
                <div className="goal">Goal: <b>{p.goal}</b></div>
                {t && (
                  <select className="select" style={{ minHeight: 36 }} value={t.status} aria-label={`${p.phase} status`} data-testid={`select-status-${t.id}`}
                    onChange={(e) => updateTask.mutate({ id: t.id, patch: { status: e.target.value as TaskStatus } }, { onError: (err) => toast("Couldn’t update", errorMessage(err), "error") })}>
                    {(Object.keys(STATUS) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                  </select>
                )}
                <ol>{p.steps.map((s) => <li key={s}><span>{s}</span></li>)}</ol>
                <div className="links">{p.links.map((l) => <Ext key={l.href} href={l.href} label={l.label} />)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SectionHead title="All sources" note={`${sources.length} references behind this teardown.`} />
        <ol className="sources">{sources.map(([l, h], i) => <li key={h}><span className="sn">{pad2(i + 1)}</span><a href={h} target="_blank" rel="noopener noreferrer">{l}</a></li>)}</ol>
      </section>
    </>
  );
}
