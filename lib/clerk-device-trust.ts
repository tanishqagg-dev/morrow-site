/** Clerk's OTP screen can verify the first factor without routing Device Trust. */
export function deviceTrustRedirectHash(status: string | null, hash: string): string | null {
 if(status !== 'needs_client_trust')return null;
 const [path, query] = hash.split('?', 2);
 if(path !== '#/factor-one')return null;
 return `#/client-trust${query ? `?${query}` : ''}`;
}
