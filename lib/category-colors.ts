export type SiteCategory =
  | "events"
  | "network"
  | "team"
  | "coaches"
  | "physio"
  | "content";

export interface CategoryColorTokens {
  iconGradient: string;
  cardGradient: string;
  border: string;
  borderHover: string;
  borderSubtle: string;
  shadow: string;
  glow: string;
  bgHover: string;
  text: string;
  textMuted: string;
  btn: string;
  btnHover: string;
  btnShadow: string;
  focusBorder: string;
  selection: string;
  badge: string;
  dot: string;
  filterActive: string;
  ring: string;
  surface: string;
  surfaceBorder: string;
  chip: string;
}

export const CATEGORY_COLORS: Record<SiteCategory, CategoryColorTokens> = {
  events: {
    iconGradient: "from-red-500 to-red-600",
    cardGradient: "from-red-600/20 via-red-600/10 to-slate-900/80",
    border: "border-red-500/30",
    borderHover: "group-hover:border-red-500/60",
    borderSubtle: "border-red-500/20",
    shadow: "shadow-red-500/20",
    glow: "hover:shadow-red-500/10",
    bgHover: "hover:bg-red-600/5",
    text: "text-red-400",
    textMuted: "text-red-300",
    btn: "bg-red-600",
    btnHover: "hover:bg-red-500",
    btnShadow: "shadow-red-600/20",
    focusBorder: "focus:border-red-500",
    selection: "selection:bg-red-500/30",
    badge: "bg-red-500 text-slate-950",
    dot: "bg-red-500/50",
    filterActive: "bg-red-600/10 border-red-500 text-red-400",
    ring: "ring-red-500/40",
    surface: "bg-red-950/40",
    surfaceBorder: "border-red-500/30",
    chip: "bg-red-600/15 border-red-500 text-red-300",
  },
  network: {
    iconGradient: "from-blue-500 to-blue-600",
    cardGradient: "from-blue-600/20 via-blue-600/10 to-slate-900/80",
    border: "border-blue-500/30",
    borderHover: "group-hover:border-blue-500/60",
    borderSubtle: "border-blue-500/20",
    shadow: "shadow-blue-500/20",
    glow: "hover:shadow-blue-500/10",
    bgHover: "hover:bg-blue-600/5",
    text: "text-blue-400",
    textMuted: "text-blue-300",
    btn: "bg-blue-600",
    btnHover: "hover:bg-blue-500",
    btnShadow: "shadow-blue-600/20",
    focusBorder: "focus:border-blue-500",
    selection: "selection:bg-blue-500/30",
    badge: "bg-blue-500 text-slate-950",
    dot: "bg-blue-500/50",
    filterActive: "bg-blue-600/10 border-blue-500 text-blue-400",
    ring: "ring-blue-500/40",
    surface: "bg-blue-950/40",
    surfaceBorder: "border-blue-500/30",
    chip: "bg-blue-600/15 border-blue-500 text-blue-300",
  },
  team: {
    iconGradient: "from-purple-500 to-purple-600",
    cardGradient: "from-purple-600/20 via-purple-600/10 to-slate-900/80",
    border: "border-purple-500/30",
    borderHover: "group-hover:border-purple-500/60",
    borderSubtle: "border-purple-500/20",
    shadow: "shadow-purple-500/20",
    glow: "hover:shadow-purple-500/10",
    bgHover: "hover:bg-purple-600/5",
    text: "text-purple-400",
    textMuted: "text-purple-300",
    btn: "bg-purple-600",
    btnHover: "hover:bg-purple-500",
    btnShadow: "shadow-purple-600/20",
    focusBorder: "focus:border-purple-500",
    selection: "selection:bg-purple-500/30",
    badge: "bg-purple-500 text-slate-950",
    dot: "bg-purple-500/50",
    filterActive: "bg-purple-600/10 border-purple-500 text-purple-400",
    ring: "ring-purple-500/40",
    surface: "bg-purple-950/40",
    surfaceBorder: "border-purple-500/30",
    chip: "bg-purple-600/15 border-purple-500 text-purple-300",
  },
  coaches: {
    iconGradient: "from-orange-500 to-orange-600",
    cardGradient: "from-orange-600/20 via-orange-600/10 to-slate-900/80",
    border: "border-orange-500/30",
    borderHover: "group-hover:border-orange-500/60",
    borderSubtle: "border-orange-500/20",
    shadow: "shadow-orange-500/20",
    glow: "hover:shadow-orange-500/10",
    bgHover: "hover:bg-orange-600/5",
    text: "text-orange-400",
    textMuted: "text-orange-300",
    btn: "bg-orange-600",
    btnHover: "hover:bg-orange-500",
    btnShadow: "shadow-orange-600/20",
    focusBorder: "focus:border-orange-500",
    selection: "selection:bg-orange-500/30",
    badge: "bg-orange-500 text-slate-950",
    dot: "bg-orange-500/50",
    filterActive: "bg-orange-600/10 border-orange-500 text-orange-400",
    ring: "ring-orange-500/40",
    surface: "bg-orange-950/40",
    surfaceBorder: "border-orange-500/30",
    chip: "bg-orange-600/15 border-orange-500 text-orange-300",
  },
  physio: {
    iconGradient: "from-green-500 to-green-600",
    cardGradient: "from-green-600/20 via-green-600/10 to-slate-900/80",
    border: "border-green-500/30",
    borderHover: "group-hover:border-green-500/60",
    borderSubtle: "border-green-500/20",
    shadow: "shadow-green-500/20",
    glow: "hover:shadow-green-500/10",
    bgHover: "hover:bg-green-600/5",
    text: "text-green-400",
    textMuted: "text-green-300",
    btn: "bg-green-600",
    btnHover: "hover:bg-green-500",
    btnShadow: "shadow-green-600/20",
    focusBorder: "focus:border-green-500",
    selection: "selection:bg-green-500/30",
    badge: "bg-green-500 text-slate-950",
    dot: "bg-green-500/50",
    filterActive: "bg-green-600/10 border-green-500 text-green-400",
    ring: "ring-green-500/40",
    surface: "bg-green-950/40",
    surfaceBorder: "border-green-500/30",
    chip: "bg-green-600/15 border-green-500 text-green-300",
  },
  content: {
    iconGradient: "from-yellow-500 to-yellow-600",
    cardGradient: "from-yellow-600/20 via-yellow-600/10 to-slate-900/80",
    border: "border-yellow-500/30",
    borderHover: "group-hover:border-yellow-500/60",
    borderSubtle: "border-yellow-500/20",
    shadow: "shadow-yellow-500/20",
    glow: "hover:shadow-yellow-500/10",
    bgHover: "hover:bg-yellow-600/5",
    text: "text-yellow-400",
    textMuted: "text-yellow-300",
    btn: "bg-yellow-600",
    btnHover: "hover:bg-yellow-500",
    btnShadow: "shadow-yellow-600/20",
    focusBorder: "focus:border-yellow-500",
    selection: "selection:bg-yellow-500/30",
    badge: "bg-yellow-500 text-slate-950",
    dot: "bg-yellow-500/50",
    filterActive: "bg-yellow-600/10 border-yellow-500 text-yellow-400",
    ring: "ring-yellow-500/40",
    surface: "bg-yellow-950/40",
    surfaceBorder: "border-yellow-500/30",
    chip: "bg-yellow-600/15 border-yellow-500 text-yellow-300",
  },
};

export function category(category: SiteCategory) {
  return CATEGORY_COLORS[category];
}
