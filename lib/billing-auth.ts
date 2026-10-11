// Token retrieval is read-only. A timeout must never replay a payment request.
export async function billingAuthToken(getToken: () => Promise<string | null>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await Promise.race([
      Promise.resolve().then(getToken),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Sign-in is taking too long. Check your connection and try again.")), 15_000);
      }),
    ]);
    if (!token) throw new Error("Sign in to your Morrow account first.");
    return token;
  } finally { clearTimeout(timer); }
}
