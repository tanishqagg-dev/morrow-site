import { BillingError } from "./billing";
import { desktopRequestExpired, type DesktopRequest } from "./desktop-consent";
export function pollDesktopCompletion(initial: DesktopRequest, read: () => Promise<DesktopRequest>,
  update: (request: DesktopRequest) => void, onError: (error: unknown) => void) {
  let stopped = false;
  let latest = initial;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { stopped = true; clearTimeout(timer); clearTimeout(deadline); };
  const expire = () => { if (stopped) return; stop(); update({ ...latest, status: "expired" }); };
  const check = async () => {
    if (stopped) return;
    if (desktopRequestExpired(latest)) { expire(); return; }
    try {
      const result = await read();
      if (stopped) return;
      latest = result;
      if (result.status === "connected") { stop(); update(result); return; }
      if (desktopRequestExpired(result)) { expire(); return; }
      update(result);
      clearTimeout(deadline);
      deadline = setTimeout(expire, Date.parse(result.expiresAt) - Date.now());
    } catch (error) {
      if (stopped) return;
      if (error instanceof BillingError && ["DEVICE_LOGIN_EXPIRED", "DEVICE_LOGIN_NOT_FOUND", "DEVICE_LOGIN_FORBIDDEN"].includes(error.code || "")) { expire(); return; }
      onError(error);
    }
    if (!stopped) timer = setTimeout(check, 2000);
  };
  if (desktopRequestExpired(initial)) expire();
  else if (initial.status === "approved") {
    deadline = setTimeout(expire, Date.parse(initial.expiresAt) - Date.now());
    timer = setTimeout(check, 2000);
  }
  return stop;
}
