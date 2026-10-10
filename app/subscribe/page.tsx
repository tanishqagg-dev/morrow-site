import type { Metadata } from "next";
import { BillingPortal } from "@/components/BillingPortal";

export const metadata: Metadata = {
  title: "Your Morrow account",
  description: "Create your Morrow account, review your plan and connect your Mac.",
};

export default function SubscribePage() { return <BillingPortal />; }
