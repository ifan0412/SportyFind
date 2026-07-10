export const POPUP_TARGET_PAGES = [
  { path: "/", label: "首頁" },
  { path: "/network", label: "運動夥伴列表" },
  { path: "/coaches", label: "教練列表" },
  { path: "/physio", label: "物理治療列表" },
  { path: "/events", label: "活動列表" },
] as const;

export type PopupTargetPath = (typeof POPUP_TARGET_PAGES)[number]["path"];

export const POPUP_DISMISS_MODES = [
  {
    value: "session" as const,
    label: "本次瀏覽",
    description: "用戶關閉後，同一分頁內不再顯示；重新開啟網站會再出現。",
  },
  {
    value: "user" as const,
    label: "永久（此裝置）",
    description: "用戶關閉後不再顯示，直至你下架此 pop-up。",
  },
  {
    value: "until_end" as const,
    label: "直至下架",
    description: "用戶可關閉，但換頁或重新整理後會再出現，直至排程結束或手動下架。",
  },
];

export const POPUP_ACTIVATION_MODES = [
  {
    value: "manual" as const,
    label: "手動上下架",
    description: "發佈後以「上線 / 下線」即時控制，可選擇預約開始時間。",
  },
  {
    value: "scheduled" as const,
    label: "排程上下架",
    description: "設定開始與結束時間，期間內自動顯示。",
  },
];
