export const fmtUsd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const fmtDate = (ms: number) => new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const slug = (s: string) => s.replace(/\W+/g, "-").toLowerCase();
export const pad2 = (n: number) => String(n).padStart(2, "0");
