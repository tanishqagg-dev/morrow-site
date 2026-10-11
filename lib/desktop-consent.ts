import { BillingError } from "./billing";
export type SeatInUse = { installationId: string; deviceName: string | null; lastSeenAt: string | null };
export type DesktopRequest = {
  id: string; status: "pending" | "approved" | "connected" | "expired";
  deviceName: string | null; deviceModel: string | null; appVersion: string | null;
  requestedAt: string; expiresAt: string; userCode?: string; seatInUse: SeatInUse | null;
};
export function formatUserCode(code?: string) { return (code || "").replace(/[\s-]/g, "").replace(/^(.{3})(.{3})$/, "$1 $2"); }
export function desktopRequestExpired(request: DesktopRequest, now = Date.now()) {
  return request.status === "expired" || !Number.isFinite(Date.parse(request.expiresAt)) || Date.parse(request.expiresAt) <= now;
}
export async function approveDesktopRequest(request: DesktopRequest, seatId: string, confirmed: boolean,
  send: (body: object) => Promise<unknown>, replace = false, isCurrent = () => true) {
  const check = () => {
    if (!isCurrent()) throw new Error("Your account changed. Open Morrow and start sign-in again.");
    if (desktopRequestExpired(request)) throw new BillingError("This connection request expired. Open Morrow and start sign-in again.", "DEVICE_LOGIN_EXPIRED");
    if (request.status !== "pending" || !confirmed || !/^[ACDEFGHJKMNPQRTWXY346789]{6}$/.test(request.userCode || "")) throw new Error("Confirm the code matches Morrow on your Mac first.");
  };
  check();
  if (request.seatInUse) {
    if (!replace) throw new Error("Your seat is used by another Mac. Choose Replace that Mac to continue.");
    await send({ action: "revoke_device", installationId: request.seatInUse.installationId });
    check();
  }
  await send({ action: "approve_desktop", requestId: request.id, seatId, userCode: request.userCode });
}
