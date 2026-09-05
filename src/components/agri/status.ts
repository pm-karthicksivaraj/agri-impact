"use client";

// Shared status/color helpers for moisture states.

export type StatusTone = "good" | "near" | "stressed" | "unknown";

export function statusFor(rootzone: number | null, raw: number | null): StatusTone {
  if (rootzone === null || raw === null) return "unknown";
  if (rootzone < raw) return "stressed";
  if (rootzone < raw + 10) return "near";
  return "good";
}

export const TONE_LABEL: Record<StatusTone, string> = {
  good: "OK",
  near: "WATCH",
  stressed: "STRESS",
  unknown: "NO DATA",
};

export const TONE_COLOR: Record<StatusTone, string> = {
  good: "#2E7F25",
  near: "#C9971E",
  stressed: "#B3491F",
  unknown: "#8B9683",
};

export const TONE_CLASSES: Record<StatusTone, string> = {
  good: "bg-[#E9F5E6] text-[#1E5A18] border-[#BCDDB4] dark:bg-[#1B2616] dark:text-[#9AD37F] dark:border-[#2A3825]",
  near: "bg-[#FBF3DF] text-[#8A6510] border-[#EBD9A8] dark:bg-[#262110] dark:text-[#E0B84E] dark:border-[#3A3220]",
  stressed:
    "bg-[#FBE9DF] text-[#8A3413] border-[#EEC4AE] dark:bg-[#261408] dark:text-[#E0703F] dark:border-[#3A2418",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtLiters(l: number): string {
  if (l >= 1_000_000) return `${(l / 1_000_000).toFixed(2)} ML`;
  if (l >= 1_000) return `${(l / 1_000).toFixed(1)} kL`;
  return `${Math.round(l)} L`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SEVERITY_CLASSES: Record<string, string> = {
  critical: "bg-[#FBE9DF] text-[#8A3413] border-[#EEC4AE] dark:bg-[#261408] dark:text-[#E0703F] dark:border-[#3A2418",
  warning: "bg-[#FBF3DF] text-[#8A6510] border-[#EBD9A8] dark:bg-[#262110] dark:text-[#E0B84E] dark:border-[#3A3220]",
  info: "bg-[#E9F5E6] text-[#1E5A18] border-[#BCDDB4] dark:bg-[#12241C] dark:text-[#62B5A4] dark:border-[#20362C",
};
