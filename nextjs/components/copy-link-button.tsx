"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";


export function CopyLinkButton({
  value,
  label = "Copy link"
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
