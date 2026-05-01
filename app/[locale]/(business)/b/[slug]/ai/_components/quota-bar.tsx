"use client";

import { Badge } from "@/components/ui/badge";
import type { BusinessQuotaStatus } from "@/lib/ai/quota";
import { ImageIcon, Zap } from "lucide-react";

interface Props {
  quota: BusinessQuotaStatus;
}

export function QuotaBar({ quota }: Props) {
  const { images } = quota;

  const pct =
    images.limit === null
      ? 0
      : images.limit === 0
        ? 100
        : Math.min(100, Math.round((images.used / images.limit) * 100));

  const color =
    pct >= 90 ? "text-red-500" : pct >= 70 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <ImageIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium">Imágenes este mes</span>
          {images.limit === null ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <Zap className="w-3 h-3" /> Ilimitadas
            </Badge>
          ) : (
            <span className={`text-sm font-semibold tabular-nums ${color}`}>
              {images.used} / {images.limit}
            </span>
          )}
        </div>
        {images.limit !== null && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
