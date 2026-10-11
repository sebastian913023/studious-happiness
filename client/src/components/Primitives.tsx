import type { ReactNode } from "react";
import type { VendorId } from "@shared/schema";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" width={size} height={size} aria-label="MARK">
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 23V9l7 8 7-8v14" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export const VTag = ({ id, label }: { id: VendorId; label: string }) => (
  <span className={`vtag v-${id}`}><i className="vdot" />{label}</span>
);

export const Ext = ({ href, label, className = "link-pill" }: { href: string; label: string; className?: string }) => (
  <a className={className} href={href} target="_blank" rel="noopener noreferrer">
    {label}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
  </a>
);

export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Chevron = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);
export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export function SectionHead({ title, note, right }: { title: string; note?: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {right ?? (note ? <p className="section-note">{note}</p> : null)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="page skel-page" aria-busy="true" aria-label="Loading">
      <div className="skel-head">
        <div className="skel" style={{ height: 12, width: 220 }} />
        <div className="skel" style={{ height: 40, width: "70%" }} />
        <div className="skel" style={{ height: 16, width: "90%" }} />
        <div className="skel" style={{ height: 16, width: "60%" }} />
      </div>
      <div className="skel" style={{ height: 150 }} />
      <div className="split"><div className="skel" style={{ height: 420 }} /><div className="skel" style={{ height: 420 }} /></div>
    </div>
  );
}

export function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="page">
      <div className="error-state" role="alert">
        <div className="eyebrow">Connection issue</div>
        <h2>Couldn’t load the teardown data.</h2>
        <p>{error instanceof Error ? error.message : "The API did not respond."}</p>
        <div className="btn-row"><button className="btn primary" onClick={retry}>Retry</button></div>
      </div>
    </div>
  );
}

/** Copy to clipboard with a fallback for sandboxed iframes. */
export async function copyText(t: string) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; } } catch { /* fall through */ }
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}
