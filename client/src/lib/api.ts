import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { ContentBundle, ContentKey, Scenario, InsertScenario, Task, UpdateTask, Note, InsertNote, LayerId } from "@shared/schema";
import { SEED, SEED_KEYS } from "@shared/seed";

export const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
export const exportUrl = (file: string) => `${API_BASE}/api/export/${file}`;

/* ---------- content ---------- */
/** Bundled teardown used when the API is unreachable, so the app is never blank. */
export const FALLBACK_BUNDLE: ContentBundle = { ...SEED, updatedAt: Object.fromEntries(SEED_KEYS.map((k) => [k, 0])) as ContentBundle["updatedAt"] };
export const isFallback = (b?: ContentBundle) => !!b && Object.values(b.updatedAt).every((t) => t === 0);

export const useContent = () =>
  useQuery<ContentBundle>({
    queryKey: ["/api/content"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/content`);
        if (!res.ok) throw new Error(`${res.status}`);
        return (await res.json()) as ContentBundle;
      } catch (e) {
        console.warn("API unavailable, using bundled teardown:", e);
        return FALLBACK_BUNDLE;
      }
    },
  });

export const useSaveSection = () =>
  useMutation({
    mutationFn: async ({ key, value }: { key: ContentKey; value: unknown }) => (await apiRequest("PUT", `/api/content/${key}`, value)).json() as Promise<ContentBundle>,
    onSuccess: (data) => queryClient.setQueryData(["/api/content"], data),
  });

export const useResetSections = () =>
  useMutation({
    mutationFn: async (keys?: ContentKey[]) => (await apiRequest("POST", "/api/content/reset", keys ? { keys } : {})).json() as Promise<ContentBundle>,
    onSuccess: (data) => { queryClient.setQueryData(["/api/content"], data); queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
  });

/* ---------- scenarios ---------- */
export const useScenarios = () => useQuery<Scenario[]>({ queryKey: ["/api/scenarios"] });
export const useCreateScenario = () =>
  useMutation({
    mutationFn: async (s: InsertScenario) => (await apiRequest("POST", "/api/scenarios", s)).json() as Promise<Scenario>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] }),
  });
export const useDeleteScenario = () =>
  useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/scenarios/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] }),
  });

/* ---------- tasks ---------- */
export const useTasks = () => useQuery<Task[]>({ queryKey: ["/api/tasks"] });
export const useUpdateTask = () =>
  useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTask }) => (await apiRequest("PATCH", `/api/tasks/${id}`, patch)).json() as Promise<Task>,
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      const prev = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      if (prev) queryClient.setQueryData<Task[]>(["/api/tasks"], prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(["/api/tasks"], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

/* ---------- notes ---------- */
export const useNotes = (layer?: LayerId) =>
  useQuery<Note[]>({ queryKey: ["/api/notes"], select: (all) => (layer ? all.filter((n) => n.layer === layer) : all) });
export const useCreateNote = () =>
  useMutation({
    mutationFn: async (n: InsertNote) => (await apiRequest("POST", "/api/notes", n)).json() as Promise<Note>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });
export const useDeleteNote = () =>
  useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/notes/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

/* ---------- health ---------- */
export const useHealth = () =>
  useQuery<{ status: string; uptimeSeconds: number; version: string; storage: "sqlite" | "redis" | "memory"; persistent: boolean }>({ queryKey: ["/api/health"], refetchInterval: 60_000, staleTime: 30_000, retry: 1 });

/** Human-readable message from a failed apiRequest. */
export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.match(/^\d{3}:\s*([\s\S]*)$/);
  if (!m) return raw;
  try { const j = JSON.parse(m[1]); return j.message || raw; } catch { return m[1] || raw; }
}
