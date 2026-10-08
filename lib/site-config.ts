export const siteConfig = {
  productName: "Aestrum",
  version: process.env.NEXT_PUBLIC_JARVIS_VERSION || "Pilot 0.3",
  supportUrl:
    process.env.NEXT_PUBLIC_SUPPORT_URL ||
    "mailto:support@aestrum.in",
  bulkEmail: process.env.NEXT_PUBLIC_BULK_EMAIL || "support@aestrum.in",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@aestrum.in",
  // The backend enforces the invitation before creating a paid subscription.
  betaMode: process.env.NEXT_PUBLIC_BETA_MODE !== "false",
  company: {
    name: "Aestrum", legalName: "VARUNSHRI MEDIA SOLUTIONS", businessType: "Proprietorship",
    city: "Ghaziabad", country: "India", gstin: "09AMVPV4916F1ZB",
    address: "Ground Floor, Plot No. 345, Sector 15, Vasundhra, Ghaziabad, Uttar Pradesh 201012, India",
  },
  licenseApiBase: (process.env.NEXT_PUBLIC_LICENSE_API_URL || "").replace(/\/$/, ""),
  requirements: ["macOS 13+ or Windows 10/11", "Apple silicon Mac or 64-bit PC", "Active ChatGPT subscription"],
} as const;
