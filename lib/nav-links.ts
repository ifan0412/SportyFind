import {
  Users,
  GraduationCap,
  Shield,
  Trophy,
  Activity,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/network", label: "運動夥伴", icon: Users },
  { href: "/coaches", label: "教練", icon: GraduationCap },
  { href: "/team?browse=1", label: "隊伍", icon: Shield },
  { href: "/events", label: "賽事/活動", icon: Trophy },
  { href: "/physio", label: "物理治療", icon: Activity },
  { href: "/content", label: "運動貼士", icon: Sparkles },
];
