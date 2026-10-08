import type { Metadata } from "next";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { OperatorConsole } from "@/components/OperatorConsole";

export const metadata: Metadata = {
  title: "Operator",
  robots: { index: false, follow: false },
};

export default function OperatorPage() {
  return (
    <main id="main-content" className="operator-page">
      <a className="operator-back" href="/"><ArrowLeft aria-hidden="true" /> Morrow home</a>
      <OperatorConsole />
    </main>
  );
}
