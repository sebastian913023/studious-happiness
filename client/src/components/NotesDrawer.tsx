import { useState } from "react";
import { useNotes, useCreateNote, useDeleteNote, errorMessage } from "@/lib/api";
import { useToast } from "./Toast";
import { fmtDate } from "@/lib/format";
import type { Layer } from "@/lib/layers";

export function NotesDrawer({ layer, onClose }: { layer: Layer; onClose: () => void }) {
  const notes = useNotes(layer.id);
  const create = useCreateNote();
  const remove = useDeleteNote();
  const toast = useToast();
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await create.mutateAsync({ layer: layer.id, author: author.trim() || "Anonymous", body: body.trim() });
      setBody("");
      toast("Note saved", `Attached to Layer ${layer.n} · ${layer.title}`, "success");
    } catch (err) { toast("Couldn’t save note", errorMessage(err), "error"); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Team notes" data-testid="drawer-notes">
        <div className="drawer-head">
          <div><div className="eyebrow" style={{ marginBottom: 4 }}>Layer {layer.n}</div><h2>Team notes · {layer.title}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close notes">✕</button>
        </div>
        <div className="drawer-body">
          {notes.isLoading && <div className="skel" style={{ height: 80 }} />}
          {notes.isError && <div className="error-text">Notes are unavailable while the API is offline.</div>}
          {notes.data && notes.data.length === 0 && <div className="empty">No notes on this layer yet. Add the first observation below.</div>}
          {notes.data?.map((n) => (
            <div key={n.id} className="note-item" data-testid={`note-${n.id}`}>
              <div className="nm"><span>{n.author}</span><span>{fmtDate(n.createdAt)}</span></div>
              <div className="nb">{n.body}</div>
              <div><button className="del" onClick={() => remove.mutate(n.id, { onError: (e) => toast("Couldn’t delete", errorMessage(e), "error") })}>Delete</button></div>
            </div>
          ))}
        </div>
        <form className="drawer-foot" onSubmit={submit}>
          <input className="input" placeholder="Your name (optional)" value={author} maxLength={60} onChange={(e) => setAuthor(e.target.value)} data-testid="input-note-author" />
          <textarea className="textarea" placeholder={`Add a note about ${layer.title.toLowerCase()}…`} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} data-testid="input-note-body" />
          <div className="btn-row" style={{ justifyContent: "space-between" }}>
            <span className="help">{body.length}/4000 · press N anywhere to open notes</span>
            <button className="btn primary" type="submit" disabled={!body.trim() || create.isPending} data-testid="button-note-save">{create.isPending ? "Saving…" : "Save note"}</button>
          </div>
        </form>
      </aside>
    </>
  );
}
