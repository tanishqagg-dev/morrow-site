import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type DownloadButtonProps = {
  className?: string;
  compact?: boolean;
};

export function DownloadButton({ className = "", compact = false }: DownloadButtonProps) {
  return (
    <a className={`button button-primary ${className}`} href="/activate">
      <span>{compact ? "Get access" : "Get pilot access"}</span>
      <ArrowRight aria-hidden="true" weight="bold" />
    </a>
  );
}
