import type { Summary, Vendor } from "@shared/schema";

export function PositioningMap({ points, vendors }: { points: Summary["positioning"]; vendors: Vendor[] }) {
  const grid = [0, 25, 50, 75, 100];
  const names = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
  return (
    <div className="map-wrap" role="img" aria-label={`Positioning map. ${points.map((p) => `${names[p.id]}: autonomy ${p.y}, platform breadth ${p.x}`).join("; ")}.`}>
      <span className="map-axis top">Full autonomy</span><span className="map-axis bottom">Human-assisted</span>
      <span className="map-axis left">Point solution</span><span className="map-axis right">Full platform</span>
      <div className="map-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="map-grid">{grid.map((g) => <g key={g}><line x1={g} y1="0" x2={g} y2="100" vectorEffect="non-scaling-stroke" /><line x1="0" y1={g} x2="100" y2={g} vectorEffect="non-scaling-stroke" /></g>)}</g>
          <g className="map-cross"><line x1="50" y1="0" x2="50" y2="100" vectorEffect="non-scaling-stroke" /><line x1="0" y1="50" x2="100" y2="50" vectorEffect="non-scaling-stroke" /></g>
        </svg>
        {points.map((p) => (
          <div key={p.id} className={`map-dot ${p.id === "mark" ? "lead" : ""} ${p.flip ? "flip" : ""} ${p.upMobile ? "up-m" : ""} ${p.downMobile ? "down-m" : ""}`}
            style={{ left: `${p.x}%`, top: `${100 - p.y}%`, color: `var(--v-${p.id})` }} data-testid={`map-dot-${p.id}`}>
            <i className="halo" /><i className="core" /><span>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
