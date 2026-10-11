import { BillingError } from "./billing";
export type SeatInUse = { installationId: string; deviceName: string | null; lastSeenAt: string | null };
export type DesktopRequest = {
  id: string; status: "pending" | "approved" | "connected" | "expired";
  deviceName: string | null; deviceModel: string | null; appVersion: string | null;
  requestedAt: string; expiresAt: string; seatInUse: SeatInUse | null;
};
export function normalizeDesktopCode(code: string) {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  return /^[ACDEFGHJKMNPQRTWXY346789]*$/.test(normalized) ? normalized : "";
}
export function desktopRequestExpired(request: DesktopRequest, now = Date.now()) {
  return request.status === "expired" || !Number.isFinite(Date.parse(request.expiresAt)) || Date.parse(request.expiresAt) <= now;
}
export async function approveDesktopRequest(request: DesktopRequest, seatId: string, typedCode: string,
  send: (body: object) => Promise<unknown>, replace = false, isCurrent = () => true) {
  const userCode = normalizeDesktopCode(typedCode);
  const check = () => {
    if (!isCurrent()) throw new Error("Your account changed. Open Morrow and start sign-in again.");
    if (desktopRequestExpired(request)) throw new BillingError("This connection request expired. Open Morrow and start sign-in again.", "DEVICE_LOGIN_EXPIRED");
    if (request.status !== "pending" || userCode.length !== 6) throw new Error("Enter the six-character code shown in Morrow on your Mac.");
  };
  check();
  if (request.seatInUse && !replace) throw new Error("Your seat is used by another Mac. Choose Replace that Mac to continue.");
  await send({ action: "approve_desktop", requestId: request.id, seatId, userCode,
    ...(replace && request.seatInUse ? {replaceInstallationId:request.seatInUse.installationId} : {}) });
}
