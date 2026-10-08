import type { Metadata } from "next";
import { BillingPortal } from "@/components/BillingPortal";

export const metadata: Metadata = {
  title: "Your Morrow account",
  description: "Sign in to Morrow and connect your Mac. No activation key required.",
};

// Keep existing bookmarks working while moving customers to account access.
export default function ActivatePage() { return <BillingPortal />; }
