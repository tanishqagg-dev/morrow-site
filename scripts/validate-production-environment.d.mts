export const REQUIRED_PUBLIC_VARIABLES: readonly string[];

export type ProductionEnvironmentValidation =
  | { enforced: false }
  | { enforced: true; siteOrigin: string; supabaseOrigin: string };

export function validateProductionEnvironment(
  environment?: Record<string, string | undefined>,
): ProductionEnvironmentValidation;

export function validateProductionBilling(
  environment?: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): Promise<void>;
