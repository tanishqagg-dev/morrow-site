export type LicenseStatus = "issued" | "active" | "revoked" | "expired";
export type DownloadPlatform = "macos" | "windows";

export type LicenseCheckResponse = {
  eligible: boolean;
  status: "recognized" | "pending" | "unavailable";
  message: string;
  requestId?: string;
  downloadUrl?: string;
  downloadExpiresAt?: number;
};

export type OperatorIssuedLicense = {
  license: {
    id: string;
    status: "issued";
    plan: string;
    features: string[];
    issuedAt: number;
    expiresAt: number | null;
  };
  activationCode: string;
  codeReference: string;
  activationCodeShownOnce: true;
};

export type OperatorLicenseItem = {
  id: string;
  codeReference: string;
  status: LicenseStatus;
  plan: string;
  features: string[];
  issuedAt: number;
  expiresAt: number | null;
  firstActivatedAt: number | null;
  revokedAt: number | null;
  device: {
    active: true;
    activatedAt: number;
    lastSeenAt: number;
    appVersion: string;
  } | null;
};

export type OperatorLicenseListResponse = {
  items: OperatorLicenseItem[];
  nextCursor: string | null;
};
