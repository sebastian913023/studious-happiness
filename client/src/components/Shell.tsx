import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LAYERS, layerByPath, nextLayer } from "@/lib/layers";
import { useTheme } from "@/lib/theme";
import { useHealth, useNotes, useContent, isFallback } from "@/lib/api";
import { Logo, SearchIcon, Arrow } from "./Primitives";
import { CommandPalette } from "./CommandPalette";
import { NotesDrawer } from "./NotesDrawer";
import { DataManager } from "./DataManager";
import type { LayerId } from "@shared/schema";

const Sun = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
const Moon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
const NoteIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H8l-4 4z" /></svg>;
const DbIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>;

export function Shell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggle } = useTheme();
  const layer = layerByPath(location) ?? LAYERS[0];
  const idx = LAYERS.indexOf(layer);
  const [search, setSearch] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const health = useHealth();
  const content = useContent();
  const offline = health.isError || isFallback(content.data);
  const notes = useNotes(layer.id as LayerId);
  const noteCount = notes.data?.length ?? 0;

  useEffect(() => { document.title = `${layer.title} — MARK Intelligence`; document.getElementById("main")?.scrollTo({ top: 0 }); }, [layer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); return; }
      if (e.key === "Escape") { setSearch(false); setNotesOpen(false); setDataOpen(false); return; }
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && !search && !notesOpen && !dataOpen) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 5) navigate(LAYERS[n - 1].path);
        if (e.key.toLowerCase() === "n") setNotesOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, search, notesOpen, dataOpen]);

  const ThemeBtn = ({ className = "" }: { className?: string }) => (
    <button className={`icon-btn ${className}`} onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} data-testid="button-theme">
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );

  const next = nextLayer(layer.id as LayerId);

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="sidebar" aria-label="Layers">
        <Link className="brand" href="/" data-testid="link-brand">
          <span style={{ color: "var(--color-primary)", display: "flex" }}><Logo /></span>
          <span><span className="brand-name" style={{ display: "block" }}>MARK</span><span className="brand-sub" style={{ display: "block" }}>Intelligence</span></span>
        </Link>
        <div className="layers-label">Five layers</div>
        <nav className="layers" aria-label="Primary">
          {LAYERS.map((l) => (
            <Link key={l.id} className="layer-link" href={l.path} aria-current={l.id === layer.id ? "page" : undefined} data-testid={`link-layer-${l.n}`}>
              <span className="ln">{l.n}</span><span className="lt">{l.title}</span><span className="ls">{l.sub}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-actions">
            <button className="icon-btn grow" onClick={() => setSearch(true)} data-testid="button-search" aria-label="Search the teardown">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><SearchIcon /> Search</span><kbd>⌘K</kbd>
            </button>
            <ThemeBtn />
          </div>
          <div className="side-actions">
            <button className="icon-btn grow" onClick={() => setNotesOpen(true)} data-testid="button-notes" aria-label="Open team notes">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><NoteIcon /> Notes</span>{noteCount > 0 && <span className="count-badge">{noteCount}</span>}
            </button>
            <button className="icon-btn" onClick={() => setDataOpen(true)} data-testid="button-data" aria-label="Manage teardown data"><DbIcon /></button>
          </div>
          <div className="side-meta">
            Teardown prepared April 7, 2026<br />
            {offline ? <span className="offline">API offline · bundled data, read-only</span>
              : health.data ? <span className={health.data.persistent ? "live" : "offline"}>{health.data.persistent ? `API live · ${health.data.storage} · v${health.data.version}` : "API live · ephemeral storage"}</span>
              : <span>Connecting…</span>}
          </div>
        </div>
      </aside>

      <header className="topbar">
        <div className="crumb"><span>Layer {layer.n}</span><span className="sep">/</span><b>{layer.title}</b></div>
        <div className="progress" aria-hidden="true">{LAYERS.map((l, k) => <i key={l.id} className={k <= idx ? "on" : ""} />)}</div>
        <div className="topbar-actions">
          <button className="icon-btn mobile-only" onClick={() => setNotesOpen(true)} aria-label="Open team notes"><NoteIcon />{noteCount > 0 && <span className="count-badge">{noteCount}</span>}</button>
          <button className="icon-btn mobile-only" onClick={() => setSearch(true)} aria-label="Search the teardown"><SearchIcon /></button>
          <ThemeBtn className="mobile-only" />
        </div>
      </header>

      <main className="main" id="main" tabIndex={-1}>
        <div className="page" key={layer.id} data-testid={`page-${layer.n}`}>
          {children}
          <Link className="next" href={next.path} data-testid="link-next">
            <span><span className="nl">{idx === LAYERS.length - 1 ? "Back to" : "Continue to"} layer {next.n}</span><span className="nt" style={{ display: "block" }}>{next.title} · {next.sub}</span></span>
            <Arrow />
          </Link>
        </div>
      </main>

      <nav className="tabbar" aria-label="Layers">
        {LAYERS.map((l) => (
          <Link key={l.id} href={l.path} aria-current={l.id === layer.id ? "page" : undefined}><span className="tn">{l.n}</span><span className="tt">{l.title}</span></Link>
        ))}
      </nav>

      {search && <CommandPalette onClose={() => setSearch(false)} />}
      {notesOpen && <NotesDrawer layer={layer} onClose={() => setNotesOpen(false)} />}
      {dataOpen && <DataManager onClose={() => setDataOpen(false)} />}
    </div>
  );
}
