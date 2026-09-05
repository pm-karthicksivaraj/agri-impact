"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "banana" | "wheat" | "rust";
}) {
  const toneClass =
    tone === "banana"
      ? "text-[#2E7F25] dark:text-[#55B54A]"
      : tone === "wheat"
        ? "text-[#C9971E] dark:text-[#E0B84E]"
        : tone === "rust"
          ? "text-[#B3491F] dark:text-[#E0703F]"
          : "text-foreground";

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground leading-relaxed">
            {label}
          </p>
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#2E7F25] dark:text-[#55B54A]" aria-hidden /> : null}
        </div>
        <p className={`mt-2 text-xl sm:text-2xl font-bold leading-none ${toneClass}`}>
          {value}
          {unit ? <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span> : null}
        </p>
        {hint ? <p className="mt-2 text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-2 h-3 w-full max-w-[180px]" />
      </CardContent>
    </Card>
  );
}
