import { type LucideIcon } from "lucide-react";



/**

 * Dark Theme Premium — escala de superfícies (fundo → primeiro plano):

 * canvas #0B1210 → workspace #111A17 → card #161F1B → featured #1A2520

 */

export const adminSurfaces = {

  canvas: "#0B1210",

  workspace: "#111A17",

  card: "#161F1B",

  cardFeatured: "#1A2520",

  hover: "#202C26",

  tableHead: "#141D19",

  tableZebra: "rgba(255,255,255,0.02)",

  glass: "rgba(11,18,16,0.72)",

  glassBorder: "rgba(255,255,255,0.06)",

} as const;



export const adminColors = {

  green: "#10B981",

  greenBright: "#22C55E",

  glow: "rgba(16,185,129,0.15)",

  textPrimary: "#F3F5F4",

  textSecondary: "#A5B3AC",

  textMuted: "#6B7C74",

  border: "rgba(255,255,255,0.06)",

  borderStrong: "rgba(255,255,255,0.10)",

  amber: "#FBBF24",

  red: "#F87171",

  sky: "#38BDF8",

} as const;



export const adminTokens = {

  page: "min-h-screen bg-[#0B1210] text-[#F3F5F4]",

  ambient:

    "pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(16,185,129,0.08),transparent_55%),radial-gradient(ellipse_55%_45%_at_0%_50%,rgba(34,197,94,0.04),transparent_50%),radial-gradient(ellipse_50%_40%_at_100%_70%,rgba(16,185,129,0.05),transparent_50%)]",

  shell: "relative mx-auto w-full max-w-[1600px] px-3 pb-8 sm:px-5 lg:px-8",

  workspace: "bg-[#111A17]",

  hero: "bg-[#111A17] border-b border-white/[0.06]",

  card: "rounded-xl border border-white/[0.06] bg-[#161F1B] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_rgba(0,0,0,0.35)]",

  cardFeatured:

    "rounded-xl border border-emerald-500/[0.12] bg-gradient-to-br from-[#1A2520] via-[#181F1C] to-[#161F1B] shadow-[0_0_0_1px_rgba(16,185,129,0.06)_inset,0_8px_40px_rgba(16,185,129,0.08),0_4px_24px_rgba(0,0,0,0.4)]",

  cardSoft:

    "rounded-xl border border-white/[0.05] bg-[#111A17] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_4px_20px_rgba(0,0,0,0.25)]",

  cardHover:

    "transition-all duration-200 hover:border-emerald-500/15 hover:bg-[#1A2520]/60 hover:shadow-[0_0_24px_rgba(16,185,129,0.06)]",

  section:

    "rounded-xl border border-white/[0.06] bg-[#141D19]",

  sectionMuted:

    "rounded-xl border border-white/[0.05] bg-[#111A17]",

  glass:

    "border-b border-white/[0.06] bg-[#0B1210]/75 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150",

  title: "text-[#F3F5F4] tracking-tight",

  subtitle: "text-sm text-[#A5B3AC]",

  input:

    "h-9 rounded-lg border-white/[0.08] bg-[#161F1B] text-sm text-[#F3F5F4] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-all duration-200 placeholder:text-[#6B7C74] focus-visible:border-emerald-500/30 focus-visible:ring-2 focus-visible:ring-emerald-500/10",

  primaryBtn:

    "rounded-lg bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2),0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_0_28px_rgba(16,185,129,0.28)] active:scale-[0.98]",

  secondaryBtn:

    "rounded-lg border border-white/[0.08] bg-[#161F1B] text-[#A5B3AC] text-sm shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-all duration-200 hover:border-emerald-500/20 hover:bg-[#1A2520] hover:text-[#F3F5F4] active:scale-[0.98]",

  tableHead:

    "text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7C74]",

  tableRow:

    "border-white/[0.04] transition-colors duration-150 hover:bg-[#202C26]",

  chartGlow:

    "pointer-events-none absolute rounded-full bg-emerald-500/[0.12] blur-3xl",

  popover:

    "rounded-xl border border-white/[0.08] bg-[#161F1B]/95 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl",

  dialog:

    "rounded-2xl border border-white/[0.08] bg-[#161F1B] text-[#F3F5F4] shadow-[0_16px_48px_rgba(0,0,0,0.6)]",

  dialogPanel:

    "rounded-xl border border-white/[0.06] bg-[#111A17] p-4 text-sm",

  selectContent:

    "rounded-xl border border-white/[0.08] bg-[#161F1B] text-[#F3F5F4]",

  label: "text-xs font-medium text-[#6B7C74]",

  drillTable:

    "[&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-[#6B7C74] [&_td]:text-[13px] [&_td]:text-[#A5B3AC] [&_tr]:border-white/[0.04] [&_tbody_tr:hover]:bg-[#202C26]",

} as const;



export type AdminStatTone = "forest" | "emerald" | "amber" | "slate" | "sky";



export type MetricSurface = "card" | "soft" | "featured";



export const metricSurfaceStyles: Record<MetricSurface, string> = {

  card: adminTokens.card,

  soft: adminTokens.cardSoft,

  featured: adminTokens.cardFeatured,

};



export const statToneStyles: Record<

  AdminStatTone,

  { icon: string; value: string; glow: string; spark: string }

> = {

  forest: {

    icon: "bg-emerald-500/12 text-[#22C55E] ring-1 ring-emerald-500/20",

    value: "text-[#F3F5F4]",

    glow: "from-emerald-500/15 via-emerald-400/5 to-transparent",

    spark: "#22C55E",

  },

  emerald: {

    icon: "bg-emerald-500/12 text-[#10B981] ring-1 ring-emerald-500/20",

    value: "text-[#22C55E]",

    glow: "from-emerald-400/12 to-transparent",

    spark: "#10B981",

  },

  amber: {

    icon: "bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20",

    value: "text-amber-400",

    glow: "from-amber-400/10 to-transparent",

    spark: "#FBBF24",

  },

  slate: {

    icon: "bg-white/5 text-[#A5B3AC] ring-1 ring-white/10",

    value: "text-[#F3F5F4]",

    glow: "from-white/5 to-transparent",

    spark: "#6B7C74",

  },

  sky: {

    icon: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20",

    value: "text-sky-400",

    glow: "from-sky-400/10 to-transparent",

    spark: "#38BDF8",

  },

};



export type AdminStatCardConfig = {

  title: string;

  value: string;

  description: string;

  meta?: string;

  icon: LucideIcon;

  tone?: AdminStatTone;

};


