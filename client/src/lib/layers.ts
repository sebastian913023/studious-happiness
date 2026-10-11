import type { LayerId } from "@shared/schema";

export interface Layer { id: LayerId; path: string; n: string; title: string; sub: string }

export const LAYERS: Layer[] = [
  { id: "overview", path: "/", n: "01", title: "Overview", sub: "Executive summary" },
  { id: "pricing", path: "/pricing", n: "02", title: "Pricing", sub: "Cost model & tiers" },
  { id: "capabilities", path: "/capabilities", n: "03", title: "Capabilities", sub: "Coverage & feature depth" },
  { id: "battlecards", path: "/battlecards", n: "04", title: "Battlecards", sub: "Head-to-head & landmines" },
  { id: "playbook", path: "/playbook", n: "05", title: "Playbook", sub: "Positioning & top actions" },
];

export const layerByPath = (path: string) => LAYERS.find((l) => l.path === path);
export const nextLayer = (id: LayerId) => LAYERS[(LAYERS.findIndex((l) => l.id === id) + 1) % LAYERS.length];
