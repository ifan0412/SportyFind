// constants/sportsSchema.ts

import { normalizeSportCategory } from "@/lib/sports-categories";

export type FieldDef = {
    key: string; 
    label: string; 
    type: "select" | "text" | "number"; 
    options?: string[]; 
    placeholder?: string;
    unit?: string;
    optional?: boolean;
    multi?: boolean;
  };
  
  // 共通的球齡選項
  const EXPERIENCE_FIELD: FieldDef = {
    key: "experience_years",
    label: "專項年資 / 球齡",
    type: "select",
    options: [
      "1 年或以下 (1 year or below)", 
      "2 - 4 年 (2 - 4 years)", 
      "5 - 9 年 (5 - 9 years)", 
      "10 年或以上 (10+ years)"
    ]
  };
  
  // 匯出專家級 Schema
  export const PRO_SPORT_SCHEMA: Record<string, FieldDef[]> = {
    "Volleyball": [
      EXPERIENCE_FIELD,
      { key: "positions", label: "場上主打位置（可多選）", type: "select", multi: true, options: ["主攻手 (OH - Outside Hitter)", "副攻手 (OPP - Opposite)", "快攻手/攔中 (MB - Middle Blocker)", "舉球員/二傳 (S - Setter)", "自由球員 (L - Libero)"] },
      { key: "spike_reach", label: "最高扣球打點 (Spike Reach)", type: "number", placeholder: "例: 310", unit: "cm" },
      { key: "block_reach", label: "最高攔網高度 (Block Height)", type: "number", placeholder: "例: 295", unit: "cm" },
      { key: "dominant_hand", label: "扣球慣用手", type: "select", options: ["右手 (Right)", "左手 (Left / 左撇優勢)"] }
    ],
  
    "Basketball": [
      EXPERIENCE_FIELD,
      { key: "positions", label: "場上定位（可多選）", type: "select", multi: true, options: ["PG 控球後衛", "SG 得分後衛", "SF 小前鋒", "PF 大前鋒", "C 中鋒"] },
      { key: "playstyle", label: "打法特色", type: "select", options: ["切入破壞 (Slashing)", "3&D 3分防守鎖", "組織串聯 (Playmaker)", "禁區低位單打 (Post Scorer)", "全能進攻 (Scoring Machine)"] },
      { key: "wingspan_cm", label: "臂展 (Wingspan)", type: "number", placeholder: "例: 195", unit: "cm" }
    ],
  
    "Tennis": [
      EXPERIENCE_FIELD,
      { key: "ntrp_level", label: "NTRP 國際分級", type: "select", options: ["3.0 (能穩定對抽)", "3.5 (具備截擊與切球)", "4.0 (具備旋轉與配球落點)", "4.5 (具備深度與強力發球)", "5.0 (全國/分齡賽選手)", "5.5+ (職業/頂尖巡迴賽選手)"] },
      { key: "backhand_type", label: "持拍與反拍打法", type: "select", options: ["右手 / 單手反拍 (Right 1H)", "右手 / 雙手反拍 (Right 2H)", "左手 / 單手反拍 (Left 1H)", "左手 / 雙手反拍 (Left 2H)"] },
      { key: "playstyle", label: "戰術偏好", type: "select", options: ["底線攻擊型 (Aggressive Baseliner)", "發球上網型 (Serve & Volley)", "防守反擊型 (Counter-Puncher)", "全場靈活型 (All-Courter)"] }
    ],
  
    "Badminton": [
      EXPERIENCE_FIELD,
      { key: "level", label: "實戰程度分級", type: "select", options: ["初階 (懂規則與基本長球)", "中階 (熟練切吊與雙打跑位)", "進階 (具備強力殺球與被動擺脫)", "選手級 (校隊/甲組名將)"] },
      { key: "specialty", label: "主攻項目", type: "select", options: ["雙打為主 (Men/Women Doubles)", "混雙專精 (Mixed Doubles)", "單打為主 (Singles)", "單雙兼修 (All-round)"] },
      { key: "playstyle", label: "球風特色", type: "select", options: ["拉吊突擊 (Control & Attack)", "暴力重殺 (Power Attacking)", "網前做球與封網 (Net Play Specialist)", "防守多拍反壓 (Defensive Counter)"] }
    ],
  
    "Soccer / Football": [
      EXPERIENCE_FIELD,
      { key: "positions", label: "擅長位置（可多選）", type: "select", multi: true, options: ["門將 (GK)", "中後衛 (CB)", "邊後衛/翼衛 (FB/WB)", "防守中場 (CDM)", "組織中場/前腰 (CM/CAM)", "邊鋒 (Winger)", "前鋒/中鋒 (ST/CF)"] },
      { key: "preferred_foot", label: "慣用腳", type: "select", options: ["右腳強勢", "左腳強勢", "左右開弓 (逆足能力強)"] },
      { key: "league_experience", label: "參賽經歷", type: "select", options: ["休閒聯誼賽 (7人/11人)", "業餘聯賽 (丙組/公開組)", "半職業 / 校隊代表", "職業等級"] }
    ],
  
    "Running / Marathon": [
      EXPERIENCE_FIELD,
      { key: "preferred_distance", label: "專攻距離", type: "select", options: ["短距離/衝刺 (5K/10K)", "半程馬拉松 (Half Marathon 21K)", "全程馬拉松 (Full Marathon 42K)", "越野跑 / 超馬 (Trail / Ultra)"] },
      { key: "marathon_pb", label: "馬拉松 PB (最佳成績)", type: "text", placeholder: "例: Sub 3:30 或 4:15:00 (若無可留空)", optional: true },
      { key: "target_pace", label: "平時練跑平均配速", type: "text", placeholder: "例: 5'15'' / km", optional: true }
    ],
  
    "Gym / Fitness": [
      EXPERIENCE_FIELD,
      { key: "training_focus", label: "主要訓練流派", type: "select", options: ["健美 / 肌肥大 (Bodybuilding)", "健力三項 (Powerlifting SBD)", "街頭健身 / 自體重 (Calisthenics)", "功能性 / CrossFit (Functional)"] },
      { key: "frequency", label: "一週訓練頻率", type: "select", options: ["1 - 2 次 (維持體能)", "3 - 4 次 (規律精進)", "5 次或以上 (重度訓練/選手)"] }
    ],

    "Pickleball": [
      EXPERIENCE_FIELD,
      { key: "positions", label: "場上定位（可多選）", type: "select", multi: true, options: ["近網 (Kitchen)", "底線進攻", "過渡區", "全能雙打"] },
      { key: "playstyle", label: "球風特色", type: "select", options: ["穩定控點 (Control)", "進攻壓制 (Aggressive)", "防守反擊 (Counter)", "網前靈活 (Net Play)"] }
    ],
  
    "default": [
      EXPERIENCE_FIELD,
      { key: "general_level", label: "自評實力程度", type: "select", options: ["入門新手 (Beginner)", "具備基礎/休閒玩家 (Intermediate)", "高階競爭者 (Advanced)", "退役或現役選手 (Pro/Competitor)"] },
      { key: "highlight_skill", label: "特殊招式或備註", type: "text", placeholder: "例: 擅長反手拍、具備教練執照等...", optional: true }
    ]
  };

const SCHEMA_BY_SLUG: Record<string, FieldDef[]> = {
  volleyball: PRO_SPORT_SCHEMA["Volleyball"],
  basketball: PRO_SPORT_SCHEMA["Basketball"],
  tennis: PRO_SPORT_SCHEMA["Tennis"],
  badminton: PRO_SPORT_SCHEMA["Badminton"],
  soccer: PRO_SPORT_SCHEMA["Soccer / Football"],
  running: PRO_SPORT_SCHEMA["Running / Marathon"],
  gym: PRO_SPORT_SCHEMA["Gym / Fitness"],
  pickleball: PRO_SPORT_SCHEMA["Pickleball"],
  boxing: PRO_SPORT_SCHEMA.default,
  yoga: PRO_SPORT_SCHEMA.default,
};

export function getSportSchema(sportName: string | null | undefined): FieldDef[] {
  if (!sportName) return PRO_SPORT_SCHEMA.default;
  const slug = normalizeSportCategory(sportName);
  if (slug && SCHEMA_BY_SLUG[slug]) return SCHEMA_BY_SLUG[slug];
  return PRO_SPORT_SCHEMA[sportName] ?? PRO_SPORT_SCHEMA.default;
}