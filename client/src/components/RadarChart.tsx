import { useEffect, useRef } from "react";
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from "chart.js";
import { useTheme, cssVar, hexA } from "@/lib/theme";
import type { Features, Vendor } from "@shared/schema";

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const wrapLabel = (l: string, mobile: boolean) => {
  if (!mobile || l.length <= 11) return l;
  return l.split(" ").reduce<string[]>((acc, w) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && (last + " " + w).length <= 12) acc[acc.length - 1] = last + " " + w; else acc.push(w);
    return acc;
  }, []);
};

export function RadarChart({ features, vendors, visible }: { features: Features; vendors: Vendor[]; visible: Record<string, boolean> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart<"radar"> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvas.current) return;
    const mobile = window.innerWidth < 600;
    chart.current = new Chart(canvas.current, {
      type: "radar",
      data: {
        labels: features.capabilities.map((c) => wrapLabel(c.name, mobile)),
        datasets: vendors.map((v, i) => ({
          label: v.name, data: features.capabilities.map((c) => c.scores[i]),
          borderWidth: v.id === "mark" ? 2.5 : 1.5, pointRadius: v.id === "mark" ? 3 : 2, pointHoverRadius: 5, fill: true, hidden: !visible[v.id],
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700, easing: "easeOutQuart" },
        layout: { padding: mobile ? 4 : 8 },
        scales: { r: { min: 0, max: 3, ticks: { display: false, stepSize: 1 }, pointLabels: { font: { family: cssVar("--font-body"), size: mobile ? 10 : 11, weight: 500 } } } },
        plugins: { legend: { display: false }, tooltip: { padding: 10, titleFont: { family: cssVar("--font-body"), weight: 700 }, bodyFont: { family: cssVar("--font-mono"), size: 12 }, callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw} / 3` } } },
      },
    });
    return () => { chart.current?.destroy(); chart.current = null; };
  }, [features, vendors]);

  useEffect(() => {
    const ch = chart.current; if (!ch) return;
    const text = cssVar("--color-text-muted"), grid = cssVar("--color-border-strong");
    ch.data.datasets.forEach((d, i) => {
      const c = cssVar(`--v-${vendors[i].id}`);
      d.borderColor = c; d.backgroundColor = hexA(c, vendors[i].id === "mark" ? 0.18 : 0.06); d.pointBackgroundColor = c; d.pointBorderColor = cssVar("--color-bg");
    });
    const r = ch.options.scales!.r!;
    (r as { angleLines?: { color?: string } }).angleLines = { color: grid };
    r.grid = { ...(r.grid || {}), color: grid };
    (r as { pointLabels?: { color?: string } }).pointLabels = { ...((r as { pointLabels?: object }).pointLabels || {}), color: text };
    const tt = ch.options.plugins!.tooltip!;
    tt.backgroundColor = cssVar("--color-surface-3"); tt.titleColor = cssVar("--color-text"); tt.bodyColor = text; tt.borderColor = grid; tt.borderWidth = 1;
    ch.update();
  }, [theme, vendors, features]);

  useEffect(() => {
    const ch = chart.current; if (!ch) return;
    vendors.forEach((v, i) => ch.setDatasetVisibility(i, !!visible[v.id]));
    ch.update();
  }, [visible, vendors]);

  return <canvas ref={canvas} role="img" aria-label="Radar chart of capability scores across eleven dimensions for four vendors" />;
}
