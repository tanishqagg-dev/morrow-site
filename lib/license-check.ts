import type { DownloadPlatform, LicenseCheckResponse } from "./contracts";
import { normalizeActivationCode } from "./activation-code";

type EdgeError = {
  error?: { message?: string };
  requestId?: string;
};

const MAX_PUBLIC_MESSAGE_LENGTH = 240;
const MAX_REQUEST_ID_LENGTH = 128;

function safePublicMessage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const message = value.trim();
  if (
    !message
    || message.length > MAX_PUBLIC_MESSAGE_LENGTH
    || /[\u0000-\u001f\u007f]/.test(message)
  ) return undefined;
  return message;
}

function safeRequestId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const requestId = value.trim();
  if (
    !requestId
    || requestId.length > MAX_REQUEST_ID_LENGTH
    || !/^[A-Za-z0-9._:-]+$/.test(requestId)
  ) return undefined;
  return requestId;
}

export function activationCheckRequest(value: string, platform: DownloadPlatform = "macos") {
  const activationCode = normalizeActivationCode(value);
  return activationCode ? { activationCode, platform } : null;
}

type ParseOptions = {
  expectedSupabaseUrl?: string;
  expectedPlatform?: DownloadPlatform;
  now?: number;
};

const INSTALLER_PATHS: Record<DownloadPlatform, RegExp> = {
  macos: /^\/storage\/v1\/object\/sign\/jarvis-releases\/macos\/aarch64\/Jarvis-(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.dmg$/,
  windows: /^\/storage\/v1\/object\/sign\/jarvis-releases\/windows\/x86_64\/Jarvis-(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.exe$/,
};

function privateInstaller(
  candidate: Partial<LicenseCheckResponse>,
  { expectedSupabaseUrl = "", expectedPlatform = "macos", now = Date.now() }: ParseOptions,
) {
  if (typeof candidate.downloadUrl !== "string" || !Number.isSafeInteger(candidate.downloadExpiresAt)) {
    return null;
  }
  let url: URL;
  let expected: URL;
  try {
    url = new URL(candidate.downloadUrl);
    expected = new URL(expectedSupabaseUrl);
  } catch {
    return null;
  }
  const tokens = url.searchParams.getAll("token");
  const nowSeconds = Math.floor(now / 1000);
  if (
    url.protocol !== "https:"
    || expected.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || expected.username !== ""
    || expected.password !== ""
    || url.origin !== expected.origin
    || !INSTALLER_PATHS[expectedPlatform].test(url.pathname)
    || url.hash !== ""
    || [...url.searchParams.keys()].some((key) => key !== "token")
    || tokens.length !== 1
    || tokens[0].length < 16
    || tokens[0].length > 8_192
    || /\s/.test(tokens[0])
    || candidate.downloadExpiresAt! <= nowSeconds
    || candidate.downloadExpiresAt! > nowSeconds + 330
  ) return null;
  return { downloadUrl: url.toString(), downloadExpiresAt: candidate.downloadExpiresAt! };
}

export function parseLicenseCheckResponse(value: unknown, options: ParseOptions = {}): LicenseCheckResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LicenseCheckResponse>;
  const message = safePublicMessage(candidate.message);
  if (
    typeof candidate.eligible !== "boolean"
    || (candidate.status !== "recognized" && candidate.status !== "pending" && candidate.status !== "unavailable")
    || !message
  ) return null;
  if (candidate.status === "recognized" && !candidate.eligible) return null;
  if (candidate.status === "pending" && !candidate.eligible) return null;
  if (candidate.status === "unavailable" && candidate.eligible) return null;
  if (
    candidate.status !== "recognized"
    && (candidate.downloadUrl !== undefined || candidate.downloadExpiresAt !== undefined)
  ) return null;
  const installer = candidate.status === "recognized" ? privateInstaller(candidate, options) : {};
  if (candidate.status === "recognized" && !installer) return null;
  const requestId = safeRequestId(candidate.requestId);
  return {
    eligible: candidate.eligible,
    status: candidate.status,
    message,
    ...(requestId ? { requestId } : {}),
    ...installer,
  };
}

export function edgeErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as EdgeError;
  return safePublicMessage(candidate.error?.message);
}

export function activationServiceErrorMessage(status: number, value: unknown) {
  if (status === 429) {
    return "Too many checks were made. Wait a minute, then try again.";
  }
  if (status >= 500) {
    return "Aestrum activation is temporarily unavailable. Please try again in a moment.";
  }
  if (status === 401 || status === 403) {
    return "Aestrum activation could not verify this request. Please try again or contact Skills4U.";
  }
  return edgeErrorMessage(value) || "This activation code could not be checked. Please try again.";
}

export function downloadExpiryDelay(expiresAt: unknown, now = Date.now()) {
  if (!Number.isSafeInteger(expiresAt) || !Number.isFinite(now)) return null;
  return Math.min(330_000, Math.max(0, (expiresAt as number) * 1_000 - now));
}
