import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Kind = "info" | "success" | "error";
interface Toast { id: number; title: string; desc?: string; kind: Kind }
const Ctx = createContext<(title: string, desc?: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((title: string, desc?: string, kind: Kind = "info") => {
    const id = ++seq.current;
    setItems((l) => [...l, { id, title, desc, kind }].slice(-4));
    window.setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} data-testid={`toast-${t.kind}`}>
            <div><div className="tt">{t.title}</div>{t.desc && <div className="td">{t.desc}</div>}</div>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
