import type { LucideIcon } from "lucide-react";
import {
  Activity,
  GraduationCap,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { CATEGORY_COLORS, type SiteCategory } from "@/lib/category-colors";

export type ListingSectionId = SiteCategory;

export interface ListingSectionConfig {
  icon: LucideIcon;
  gradient: string;
  shadow: string;
  title: string;
  subtitle: string;
  /** Short tagline under page title */
  tagline: string;
}

export const LISTING_SECTIONS: Record<ListingSectionId, ListingSectionConfig> = {
  network: {
    icon: Users,
    gradient: CATEGORY_COLORS.network.iconGradient,
    shadow: CATEGORY_COLORS.network.shadow,
    title: "運動夥伴",
    subtitle: "探索全港運動員檔案，發掘你的下一個隊友或強敵。",
    tagline: "探索夥伴",
  },
  team: {
    icon: Shield,
    gradient: CATEGORY_COLORS.team.iconGradient,
    shadow: CATEGORY_COLORS.team.shadow,
    title: "競技隊伍",
    subtitle: "尋找你的歸屬、發起友誼賽、建立無敵陣容。",
    tagline: "探索隊伍",
  },
  coaches: {
    icon: GraduationCap,
    gradient: CATEGORY_COLORS.coaches.iconGradient,
    shadow: CATEGORY_COLORS.coaches.shadow,
    title: "專業教練",
    subtitle: "嚴選各項目的專業導師與獨立訓練課程，突破你的競技天花板。",
    tagline: "探索教練",
  },
  physio: {
    icon: Activity,
    gradient: CATEGORY_COLORS.physio.iconGradient,
    shadow: CATEGORY_COLORS.physio.shadow,
    title: "運動復健",
    subtitle: "尋找專業物理治療師與運動按摩，加速你的賽後恢復。",
    tagline: "探索復健",
  },
  events: {
    icon: Trophy,
    gradient: CATEGORY_COLORS.events.iconGradient,
    shadow: CATEGORY_COLORS.events.shadow,
    title: "約戰賽事",
    subtitle: "尋找即將開打的球隊友誼賽、訓練營或散客休閒團練。",
    tagline: "探索賽事",
  },
  content: {
    icon: Sparkles,
    gradient: CATEGORY_COLORS.content.iconGradient,
    shadow: CATEGORY_COLORS.content.shadow,
    title: "運動貼士",
    subtitle: "訓練、營養與復康指南，助你打得更好、恢復更快。",
    tagline: "運動指南",
  },
};

/** Shared listing page content width — matches coaches / team / events. */
export const LISTING_PAGE_MAX_WIDTH = "max-w-[1400px]";

/** Tighter top padding on mobile to sit closer to the app header. */
export const LISTING_PAGE_SHELL_PADDING = "py-3 md:py-10";

/** Article detail width — matches team public profile. */
export const ARTICLE_PAGE_MAX_WIDTH = "max-w-4xl md:max-w-5xl";
