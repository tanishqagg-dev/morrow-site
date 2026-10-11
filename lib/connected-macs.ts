export type ConnectedMac = { installationId: string; deviceName: string | null; deviceModel: string | null; appVersion: string | null;
  activatedAt: string; lastSeenAt: string | null; seatId: string; accountName: string };
export async function revokeConnectedMac(installationId: string, send: (body: object) => Promise<unknown>) {
  await send({ action: "revoke_device", installationId });
}
export async function signOutEverywhere(send: (body: object) => Promise<unknown>, signOut: () => Promise<void>) {
  await send({ action: "sign_out_everywhere" });
  await signOut();
}
