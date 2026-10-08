import type { Metadata } from "next";
import { BillingPortal } from "@/components/BillingPortal";

export const metadata: Metadata = {
  title: "Beta access",
  description: "Sign in, enter your invitation, and subscribe to the Morrow private beta.",
};

export default function SubscribePage() { return <BillingPortal />; }
