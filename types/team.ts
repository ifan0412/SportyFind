// 支援的運動種類 (未來要擴充新運動，只需在這裡加上一個單字)
export type SportCategory = 
  | 'volleyball' 
  | 'basketball' 
  | 'soccer' 
  | 'tennis' 
  | 'badminton' 
  | 'pickleball' 
  | 'gym' 
  | 'running'
  | 'boxing'
  | 'yoga';

// 招募狀態
export type RecruitmentStatus = 'open' | 'invite_only' | 'closed';

// 球隊角色權限
export type TeamRole = 'admin' | 'coach' | 'captain' | 'player';

// --- 競技型運動 (排球、籃球、足球) ---
export interface CompetitiveMetadata {
  team_gender?: "men" | "women" | "mixed";
  home_court?: string;
  /** Merged league + division, e.g. "Super League · 甲一" */
  league_division?: string;
  /** @deprecated use league_division */
  league_name?: string;
  /** @deprecated use league_division */
  division_level?: string;
  card_bio?: string;
  location_regions?: string[];
  location_subdistricts?: string[];
  training_frequency?: string;
}

// --- 拍類運動 (網球、羽球、匹克球) ---
export interface RacketMetadata {
  team_gender?: "men" | "women" | "mixed";
  card_bio?: string;
  avg_skill_level?: string;   // e.g., "NTRP 3.0-4.0", "初中級"
  play_style?: 'singles' | 'doubles' | 'mixed' | 'all';
  court_surface?: string;     // e.g., "硬地", "室內木地板"
  equipment_provided?: boolean; // e.g., 是否提供公家羽毛球
}

// --- 體能與耐力型 (健身、路跑) ---
export interface EnduranceMetadata {
  team_gender?: "men" | "women" | "mixed";
  card_bio?: string;
  primary_focus?: string;     // e.g., "健力三項", "馬拉松配速"
  home_base?: string;         // e.g., "Anytime Fitness 尖沙咀", "跑馬地"
  avg_pace?: string;          // e.g., "5:30/km"
  required_gear?: string;     // e.g., "反光背心"
}

// 萃取動態型別的工具 (這能讓 TypeScript 自動推導出對應的 JSON 結構)
export type ExtractMetadata<T extends SportCategory> = 
  T extends 'volleyball' | 'basketball' | 'soccer' ? CompetitiveMetadata :
  T extends 'tennis' | 'badminton' | 'pickleball' ? RacketMetadata :
  T extends 'gym' | 'running' ? EnduranceMetadata : 
  Record<string, unknown>; // 預設的 fallback

// 1. Teams 表格的完整結構
export interface Team<T extends SportCategory = SportCategory> {
  id: string;
  name_en: string;
  name_zh: string | null;           // Supabase 中沒有填寫的字串通常是 null
  sport_category: T;
  recruitment_status: RecruitmentStatus;
  created_by: string;               // 關聯到 profiles.id
  created_at: string;
  
  // 選填欄位
  est_year: number | null;
  location_region: string | null;
  logo_url: string | null;
  cover_url: string | null;
  bio: string | null;
  gallery_photos?: string[];
  
  // JSONB 欄位
  social_links: {
    ig?: string;
    fb?: string;
    youtube?: string;
  };
  
  // ⭐️ 核心：根據 sport_category 自動變形的 Metadata
  sport_metadata: ExtractMetadata<T>;
}

// 2. Team Members 表格
export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

// 3. Team Achievements 表格
export interface TeamAchievement {
  id: string;
  team_id: string;
  year: number;
  title: string;
  description: string | null;
  created_at: string;
}
