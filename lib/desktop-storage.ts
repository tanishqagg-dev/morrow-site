const key = "morrow:desktop-request";
export type StoredDesktopRequest = { requestId: string; userId: string | null; expiresAt: number };
const validId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function resolveDesktopRequest(saved: unknown, incoming: string | null, userId: string | null, now = Date.now()): StoredDesktopRequest | null {
  const entry = saved as StoredDesktopRequest | null;
  if (entry && typeof entry === "object" && validId(entry.requestId)) {
    if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now || (entry.userId !== null && entry.userId !== userId)) return null;
    if (incoming && incoming !== entry.requestId && validId(incoming)) return { requestId: incoming, userId, expiresAt: now + 1800000 };
    return { ...entry, userId: entry.userId ?? userId };
  }
  return validId(incoming) ? { requestId: incoming, userId, expiresAt: now + 1800000 } : null;
}
export function clearDesktopRequest(storage: Pick<Storage, "removeItem">) { storage.removeItem(key); }
