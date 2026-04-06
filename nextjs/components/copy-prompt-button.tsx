"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-start justify-between gap-3 rounded-md bg-muted px-3 py-2.5 text-left text-sm font-mono text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground w-full"
    >
      <span className="break-words flex-1">{prompt}</span>
      {copied ? (
        <Check className="size-3.5 mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
}
