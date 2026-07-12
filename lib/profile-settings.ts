import { Bell, Settings, Shield, type LucideIcon } from "lucide-react";

export interface ProfileSettingItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const PROFILE_SETTINGS_ITEMS: ProfileSettingItem[] = [
  {
    id: "account",
    label: "我的帳戶設定",
    description: "登入電郵、密碼與帳戶安全",
    href: "/profile/settings/account",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "通知管理",
    description: "推送通知權限與類別偏好",
    href: "/profile/settings/notifications",
    icon: Bell,
  },
];

export const PROFILE_SETTINGS_TAB = {
  id: "settings" as const,
  icon: Settings,
  label: "設定",
};
