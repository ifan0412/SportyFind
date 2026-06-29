"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ==========================================
// 型別宣告 (TypeScript Interfaces)
// ==========================================
interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
}

interface Sport {
  id: string;
  name: string;
}

interface UserSport {
  id: string;
  metadata: {
    position?: string;
    handedness?: string;
    playerType?: string;
    [key: string]: any;
  };
  sports: {
    name: string;
  } | null;
}

function ProfilePageContent() {
  const supabase = createSupabaseBrowserClient();

  // 核心資料狀態
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  
  // 互動機制狀態
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 表單輸入狀態
  const [selectedSportId, setSelectedSportId] = useState("");
  const [vballPosition, setVballPosition] = useState("Setter");
  const [tennisHandedness, setTennisHandedness] = useState("Right-handed");
  const [tennisPlayerType, setTennisPlayerType] = useState("Baseline");

  const loadProfileData = async (userId: string) => {
    try {
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profData) setProfile(profData);

      const { data: usData } = await supabase
        .from("user_sports")
        .select(` id, metadata, sports ( name ) `)
        .eq("user_id", userId);

      if (usData) setUserSports(usData as unknown as UserSport[]);

      const { data: sData } = await supabase
        .from("sports")
        .select("*");
      
      if (sData) setAllSports(sData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        await loadProfileData(authUser.id);
      } else {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const currentSelectedSportName = allSports.find(s => s.id === selectedSportId)?.name;

  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSportId || !user) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    let metadataPayload = {};
    if (currentSelectedSportName === "Volleyball") {
      metadataPayload = { position: vballPosition };
    } else if (currentSelectedSportName === "Tennis") {
      metadataPayload = { handedness: tennisHandedness, playerType: tennisPlayerType };
    }

    try {
      const { error } = await supabase
        .from("user_sports")
        .insert({
          user_id: user.id,
          sport_id: selectedSportId,
          metadata: metadataPayload
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("您已經將此運動項目加入到您的檔案中了！");
        }
        throw error;
      }

      await loadProfileData(user.id);
      setIsModalOpen(false);
      setSelectedSportId("");
    } catch (err: any) {
      setErrorMessage(err.message || "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="h-64 w-full bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
          <div className="h-40 w-full bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
        </div>
        <div className="hidden lg:block h-96 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-neutral-900 border border-neutral-800 rounded-xl">
        <h2 className="text-xl font-bold mb-2 text-white">歡迎來到 Pro Sports Network</h2>
        <p className="text-neutral-400 text-sm mb-6">請先登入以解鎖專業運動員社交網路。</p>
        <button className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">
          登入帳戶
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-neutral-200 antialiased selection:bg-blue-600 selection:text-white">
      {/* 頂級社群寬版容器 */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ==========================================
            左側 / 主核心牆 (占 3 欄，LinkedIn 個人檔案主體)
           ========================================== */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* 1. LinkedIn 經典大字卡：Banner + 懸浮頭像 + 社交排版 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm relative">
            <div className="h-48 bg-gradient-to-r from-neutral-800 via-blue-950 to-neutral-800 bg-size-200 relative">
              <div className="absolute inset-0 bg-black/10" />
            </div>
            
            <div className="p-6 pt-0 relative flex flex-col md:flex-row md:items-end md:justify-between">
              {/* 大頭貼重疊 Banner */}
              <div className="w-32 h-32 rounded-full bg-neutral-800 border-4 border-neutral-900 flex items-center justify-center text-4xl font-extrabold text-white shadow-md absolute -top-16 left-6 ring-1 ring-neutral-800">
                {profile?.full_name?.[0] || user.email?.[0].toUpperCase()}
              </div>
              
              {/* 用戶主標題區塊 */}
              <div className="pt-20 md:pt-6 md:pl-36 space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{profile?.full_name || "新運動員"}</h1>
                  <span className="bg-neutral-800 text-neutral-400 text-xs font-medium px-2 py-0.5 rounded-full border border-neutral-700">1st</span>
                </div>
                <p className="text-neutral-300 text-base font-normal leading-relaxed">
                  {profile?.bio || "這傢伙很懶，還沒有填寫專業運動教練/選手的個人簡介。"}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400 pt-1">
                  <span>📍 {profile?.location || "未設定地點"}</span>
                  <span className="text-neutral-600">•</span>
                  <a href="#" className="text-blue-400 font-medium hover:underline">聯絡資料</a>
                  <span className="text-neutral-600">•</span>
                  <span className="text-blue-400 font-medium hover:underline cursor-pointer">500+ 位聯絡人</span>
                </div>
              </div>
            </div>

            {/* LinkedIn 標配頂層動作按鈕列 */}
            <div className="px-6 pb-6 flex flex-wrap gap-2.5 border-t border-neutral-800/60 pt-4 mt-2">
              <button 
                onClick={() => { setIsModalOpen(true); setErrorMessage(null); }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-full transition shadow-md"
              >
                開放服務 (Open to)
              </button>
              <button className="border border-blue-400 text-blue-400 hover:bg-blue-950/40 text-sm font-semibold px-5 py-2 rounded-full transition">
                新增檔案區塊
              </button>
              <button className="border border-neutral-600 text-neutral-300 hover:bg-neutral-800 text-sm font-semibold px-4 py-2 rounded-full transition">
                更多
              </button>
            </div>
          </div>

          {/* 2. 數據儀表板 (LinkedIn Dashboard - 私人專屬視覺語彙) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-base font-bold text-white">您的專屬後台</h3>
              <p className="text-neutral-400 text-xs flex items-center gap-1">🔒 只有您看得到這些數據</p>
            </div>
            <div className="grid grid-cols-3 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/80">
              <div className="space-y-1 hover:bg-neutral-900/60 p-2 rounded-lg cursor-pointer transition">
                <span className="block text-xl font-bold text-blue-400 tracking-tight">142</span>
                <span className="block text-xs text-neutral-400 leading-tight">誰看過您的檔案</span>
              </div>
              <div className="space-y-1 border-x border-neutral-800 px-4 hover:bg-neutral-900/60 p-2 rounded-lg cursor-pointer transition">
                <span className="block text-xl font-bold text-blue-400 tracking-tight">1,824</span>
                <span className="block text-xs text-neutral-400 leading-tight">運動貼文曝光次數</span>
              </div>
              <div className="space-y-1 hover:bg-neutral-900/60 p-2 rounded-lg cursor-pointer transition">
                <span className="block text-xl font-bold text-blue-400 tracking-tight">48</span>
                <span className="block text-xs text-neutral-400 leading-tight">搜尋結果出現次數</span>
              </div>
            </div>
          </div>

          {/* 3. 核心變更：仿 LinkedIn「工作/專業經歷」設計的運動專長清單 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">體育專長 & 核心資歷</h2>
                <p className="text-xs text-neutral-400 mt-0.5">列出您經過驗證的專業運動技能與場上配置指標</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(true); setErrorMessage(null); }}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 p-2 rounded-full transition flex items-center justify-center"
                title="新增項目"
              >
                <span className="text-xl font-semibold">＋ 新增專長</span>
              </button>
            </div>

            {userSports.length === 0 ? (
              <div className="text-center py-8 bg-neutral-950 border border-dashed border-neutral-800 rounded-xl">
                <p className="text-neutral-500 text-sm">目前您的體育履歷一片空白。立即點擊右上角新增運動專業指標！</p>
              </div>
            ) : (
              /* 仿 LinkedIn 經歷項目列表結構 */
              <div className="divide-y divide-neutral-800/80">
                {userSports.map((us) => (
                  <div key={us.id} className="py-5 first:pt-0 last:pb-0 flex items-start gap-4 animate-fadeIn">
                    {/* 左側：運動ICON模擬圖示 */}
                    <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                      {us.sports?.name === "Volleyball" ? "🏐" : us.sports?.name === "Tennis" ? "🎾" : "🏆"}
                    </div>
                    
                    {/* 右側：標準 LinkedIn 資歷排版 */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white leading-tight">
                          {us.sports?.name === "Volleyball" ? "排球專長資歷" : us.sports?.name === "Tennis" ? "網球專業選手" : us.sports?.name}
                        </h4>
                      </div>
                      <p className="text-sm font-medium text-blue-400">{us.sports?.name} Professional</p>
                      <p className="text-xs text-neutral-500">認證機構：Pro Sports Network 官方資料庫 • 永久有效</p>
                      
                      {/* 動態指標數據解包 */}
                      <div className="mt-3 pt-2 px-3 py-2 bg-neutral-950 rounded-lg border border-neutral-800 inline-block text-sm">
                        <span className="text-neutral-400 font-medium">技術數據背包 (JSONB)：</span>
                        <div className="mt-1 text-neutral-300 inline-flex flex-wrap gap-x-4 gap-y-1">
                          {us.sports?.name === "Volleyball" && us.metadata?.position && (
                            <span>🏐 <span className="text-neutral-500">主攻/場上位置:</span> <strong className="text-white font-semibold">{us.metadata.position}</strong></span>
                          )}
                          {us.sports?.name === "Tennis" && (
                            <>
                              {us.metadata?.handedness && <span>🎾 <span className="text-neutral-500">慣用手:</span> <strong className="text-white font-semibold">{us.metadata.handedness}</strong></span>}
                              {us.metadata?.playerType && <span>⚡ <span className="text-neutral-500">戰術打法:</span> <strong className="text-white font-semibold">{us.metadata.playerType}</strong></span>}
                            </>
                          )}
                          {us.sports?.name !== "Volleyball" && us.sports?.name !== "Tennis" && Object.keys(us.metadata).map(key => (
                            <span key={key} className="capitalize">🔹 <span className="text-neutral-500">{key}:</span> <strong className="text-white font-semibold">{us.metadata[key]}</strong></span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            右側側邊欄 (占 1 欄，社交網路必備的「黃金右欄」)
           ========================================== */}
        <div className="hidden lg:block space-y-4">
          
          {/* 右欄模組 1：檔案強度 (Profile Strength Meter) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-bold">個人檔案完整度</span>
              <span className="text-blue-400 font-semibold">進階 (Intermediate)</span>
            </div>
            <div className="w-full bg-neutral-950 rounded-full h-1.5 border border-neutral-800">
              <div className="bg-blue-500 h-1.5 rounded-full w-2/3" />
            </div>
            <p className="text-xs text-neutral-400 leading-normal">
              添加您的時薪與教練證照，即可解鎖「官方藍勾勾認證」並提升 5 倍曝光率。
            </p>
          </div>

          {/* 右欄模組 2：人脈推薦牆 (People You May Know) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-white tracking-wide">為您推薦的體育菁英</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center font-bold">🏐</div>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-white truncate hover:underline cursor-pointer">陳教練 (Alex Chen)</span>
                  <span className="block text-neutral-400 truncate">國家級排球 A 級教練 • 時薪 $800</span>
                </div>
                <button className="border border-neutral-600 hover:border-neutral-400 text-white font-medium px-2.5 py-1 rounded-full text-[11px] transition">＋ 連結</button>
              </div>
              <div className="flex items-center gap-3 text-xs pt-1 border-t border-neutral-800/50">
                <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center font-bold">🎾</div>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-white truncate hover:underline cursor-pointer">林本初 (Tennis Pro)</span>
                  <span className="block text-neutral-400 truncate">前網球職業選手 • 底線對抗專家</span>
                </div>
                <button className="border border-neutral-600 hover:border-neutral-400 text-white font-medium px-2.5 py-1 rounded-full text-[11px] transition">＋ 連結</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          大師級動態彈出視窗 (表單邏輯維持不變)
         ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-white">新增體育專業指標 (LinkedIn 模式)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">選擇運動項目</label>
                <select 
                  value={selectedSportId} 
                  onChange={(e) => setSelectedSportId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- 請選擇 --</option>
                  {allSports.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {currentSelectedSportName === "Volleyball" && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                  <label className="block text-sm font-medium text-neutral-400">場上專長位置 (Position)</label>
                  <select 
                    value={vballPosition} 
                    onChange={(e) => setVballPosition(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Setter">舉球員 (Setter)</option>
                    <option value="Outside Hitter">主攻手 (Outside Hitter)</option>
                    <option value="Opponent">舉球對角 (Opponent)</option>
                    <option value="Middle Blocker">快攻手 (Middle Blocker)</option>
                    <option value="Libero">自由球員 (Libero)</option>
                  </select>
                </div>
              )}

              {currentSelectedSportName === "Tennis" && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">持拍慣用手 (Handedness)</label>
                    <select 
                      value={tennisHandedness} 
                      onChange={(e) => setTennisHandedness(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm text-white focus:outline-none"
                    >
                      <option value="Right-handed">右手持拍 (Right-handed)</option>
                      <option value="Left-handed">左手持拍 (Left-handed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">戰術風格 (Player Type)</label>
                    <select 
                      value={tennisPlayerType} 
                      onChange={(e) => setTennisPlayerType(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2 text-sm text-white focus:outline-none"
                    >
                      <option value="Baseline">底線型 (Baseline)</option>
                      <option value="All-Court">全場型 (All-Court)</option>
                      <option value="Serve and Volley">發球上網型 (Serve and Volley)</option>
                    </select>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="text-xs text-red-400 bg-red-950/50 border border-red-900 p-2.5 rounded-lg">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm px-4 py-2 rounded-lg"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedSportId}
                  className="bg-blue-600 text-white hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
                >
                  {isSubmitting ? "正在儲存..." : "確認加入"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 關閉 SSR 的高階封裝元件
const ProfilePage = dynamic(() => Promise.resolve(ProfilePageContent), {
  ssr: false,
});

export default ProfilePage;