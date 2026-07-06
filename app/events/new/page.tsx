"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Calendar as CalendarIcon, MapPin, Users, AlertTriangle, 
  Shield, Trophy, Loader2, ArrowLeft, Clock, ChevronLeft, ChevronRight 
} from "lucide-react";
import Link from "next/link";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import { normalizeDistrictIds, normalizeSubdistrictIds } from "@/lib/hk-locations";

interface TeamOption {
  id: string;
  name: string;
  role: string;
  sport_category: string;
}

// --- 客製化極簡日曆元件 ---
function CustomDatePicker({ value, onChange }: { value: string; onChange: (dateStr: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(currentValDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentValDate.getMonth());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-left font-bold flex items-center justify-between text-white transition shadow-inner cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-blue-400" />
          {value ? value : "請點選活動日期"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-white">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["日", "一", "二", "三", "四", "五", "六"].map(d => (
              <span key={d} className="text-[10px] font-black text-zinc-500 py-1">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    isSelected ? "bg-blue-600 text-white shadow-md" : "hover:bg-slate-800 text-zinc-300"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- 客製化 12 小時制 (AM/PM) 滑輪時間選取器 ---
function TimeScroller({ label, value, onChange }: { label: string; value: string; onChange: (timeStr: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [rawH = "19", mStr = "00"] = value.split(":");
  const h24 = parseInt(rawH, 10);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  const h12Str = String(h12).padStart(2, "0");

  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ["00", "15", "30", "45"];
  const periods: ("AM" | "PM")[] = ["AM", "PM"];

  const updateTime = (newH12: string, newM: string, newP: "AM" | "PM") => {
    let h = parseInt(newH12, 10);
    if (newP === "AM" && h === 12) h = 0;
    else if (newP === "PM" && h < 12) h += 12;
    const formatted24 = `${String(h).padStart(2, "0")}:${newM}`;
    onChange(formatted24);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-zinc-300 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-left font-bold flex items-center justify-between text-white transition shadow-inner cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-400" />
          {parseInt(h12Str, 10)}:{mStr} {period}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 flex gap-1.5">
          <div className="flex-1 max-h-48 overflow-y-auto pr-1 space-y-1">
            <div className="text-[10px] font-black text-zinc-500 text-center sticky top-0 bg-slate-900 pb-1">時</div>
            {hours12.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => updateTime(h, mStr, period)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  h12Str === h ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-zinc-400 hover:text-white"
                }`}
              >
                {parseInt(h, 10)}
              </button>
            ))}
          </div>

          <div className="w-px bg-slate-800 my-1" />

          <div className="flex-1 max-h-48 overflow-y-auto px-1 space-y-1">
            <div className="text-[10px] font-black text-zinc-500 text-center sticky top-0 bg-slate-900 pb-1">分</div>
            {minutes.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => updateTime(h12Str, m, period)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  mStr === m ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-zinc-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="w-px bg-slate-800 my-1" />

          <div className="flex-1 space-y-1">
            <div className="text-[10px] font-black text-zinc-500 text-center sticky top-0 bg-slate-900 pb-1">時段</div>
            {periods.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  updateTime(h12Str, mStr, p);
                  setIsOpen(false);
                }}
                className={`w-full py-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                  period === p ? "bg-amber-600 text-white" : "hover:bg-slate-800 text-zinc-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [myTeams, setMyTeams] = useState<TeamOption[]>([]);

  // 表單狀態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("practice");
  const [sportCategory, setSportCategory] = useState("volleyball");
  const [registrationType, setRegistrationType] = useState<"individual" | "team">("individual");
  const [organizerTeamId, setOrganizerTeamId] = useState<string>("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [subdistricts, setSubdistricts] = useState<string[]>([]);
  const [maxCapacity, setMaxCapacity] = useState<string>("");
  const [fee, setFee] = useState<string>("0");
  const [lateHours, setLateHours] = useState<string>("24");

  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("19:00");
  const [endTimeStr, setEndTimeStr] = useState("21:00");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // 🔥 修正：一併撈取 teams 表的 sport_category 欄位
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("role, team_id, teams (id, name_zh, name_en, sport_category)")
        .eq("user_id", user.id)
        .in("role", ["admin", "coach"]);

      if (teamMembers) {
        const teams = teamMembers
          .filter((tm: any) => tm.teams)
          .map((tm: any) => ({
            id: tm.teams.id,
            name: tm.teams.name_zh || tm.teams.name_en || "未命名球隊",
            role: tm.role,
            sport_category: tm.teams.sport_category || "volleyball",
          }));
        setMyTeams(teams);
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setDateStr(`${yyyy}-${mm}-${dd}`);
      setIsLoading(false);
    };

    init();
  }, [supabase, router]);

  // 🔥 嚴格篩選：依據當前選擇的運動項目（排球/網球...）過濾可主辦的隊伍
  const filteredTeams = myTeams.filter(t => t.sport_category === sportCategory);

  // 當切換運動類別時，如果舊選取的球隊不符合新類別，自動清空選取
  useEffect(() => {
    if (organizerTeamId) {
      const selected = myTeams.find(t => t.id === organizerTeamId);
      if (selected && selected.sport_category !== sportCategory) {
        setOrganizerTeamId("");
      }
    }
  }, [sportCategory, organizerTeamId, myTeams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim() || !locationName.trim() || !dateStr || !startTimeStr || !endTimeStr) {
      setErrorMsg("請填寫所有必填欄位！");
      return;
    }

    const eventDistricts = normalizeDistrictIds(districts, null);
    if (!eventDistricts.length) {
      setErrorMsg("請至少選擇一個活動地區");
      return;
    }

    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (startDateTime >= endDateTime) {
      setErrorMsg("活動結束時間必須晚於開始時間！");
      return;
    }

    if (registrationType === "team" && !organizerTeamId) {
      setErrorMsg("發起「球隊對戰/聯賽活動」必須選擇一個主辦球隊！");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("尚未登入");

      const payload = {
        creator_id: user.id,
        organizer_team_id: organizerTeamId || null,
        sport_category: sportCategory,
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        registration_type: registrationType,
        location_name: locationName.trim(),
        location_address: locationAddress.trim() || null,
        districts: eventDistricts,
        subdistricts: normalizeSubdistrictIds(subdistricts),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        fee: fee ? parseFloat(fee) : 0,
        late_cancellation_hours: parseInt(lateHours || "24", 10),
        status: "published",
      };

      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      if (registrationType === "individual" && data) {
        await supabase.from("event_registrations").insert({
          event_id: data.id,
          user_id: user.id,
          companion_count: 0,
          status: "going",
        });
      }

      alert("🎉 活動發佈成功！");
      router.push(`/events/${data.id}`);
    } catch (err: any) {
      console.error("發佈失敗詳細錯誤:", JSON.stringify(err, null, 2));
      const realMessage = err?.message || err?.details || "發佈時發生未知錯誤";
      setErrorMsg(`發佈失敗 (${err?.code || 'ERROR'}): ${realMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        載入發佈系統...
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 返回約戰大廳
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="border-b border-slate-800 pb-6 mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" /> 發起運動賽事或聚會
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              設定報名規則、人數限制以及紅旗退賽預警，系統會自動依據運動類別嚴格隔離球隊。
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded-2xl text-red-300 text-sm font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. 報名維度選擇 */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <label className="text-xs font-black text-blue-400 uppercase tracking-wider block">
                報名維度與模式
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRegistrationType("individual")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    registrationType === "individual"
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-lg"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-black text-sm mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" /> 個人約戰 / 團練
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    以「個人」為報名單位。先到先得，開放參賽者設定攜伴人數 (+Companion)，滿額自動排候補。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRegistrationType("team")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    registrationType === "team"
                      ? "bg-amber-600/20 border-amber-500 text-white shadow-lg"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-black text-sm mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" /> 球隊約戰 / 邀請盃賽
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    以「整支球隊」為報名單位。採主辦方審核制，被接受的隊伍始得參賽，不允許個人散客報名。
                  </p>
                </button>
              </div>
            </div>

            {/* 2. 運動項目與性質 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-blue-400 mb-2">運動項目 *</label>
                <select
                  value={sportCategory}
                  onChange={(e) => setSportCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/50 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  {SPORT_CATEGORIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.labelZh} ({s.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 mb-2">活動性質</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="practice">訓練 / 團練</option>
                  <option value="match">友誼賽 / 對戰</option>
                  <option value="social">聚會 / 休閒</option>
                  <option value="tournament">正式盃賽</option>
                </select>
              </div>
            </div>

            {/* 3. 代表球隊選擇（嚴格依照選定之運動項目隔離顯示） */}
            <div>
              <label className="block text-xs font-black text-zinc-300 mb-2">
                代表主辦團隊（僅顯示與「{sportCategory}」類別相符的球隊）
              </label>
              {filteredTeams.length > 0 ? (
                <select
                  value={organizerTeamId}
                  onChange={(e) => setOrganizerTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">個人獨立主辦 (無歸屬球隊)</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      🛡️ {t.name} ({t.role === "admin" ? "管理員" : "教練"})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3.5 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-xs text-zinc-500">
                  您目前沒有管理任何「{sportCategory}」類別的球隊，將以個人名義發起此活動。
                </div>
              )}
            </div>

            {/* 4. 活動標題 */}
            <div>
              <label className="block text-xs font-black text-zinc-300 mb-2">活動標題 *</label>
              <input
                type="text"
                required
                placeholder="例：週六維港夜間排球攻防訓練 / 週末網球單打交流"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* 5. 日期與時間排程 */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4">
              <label className="text-xs font-black text-blue-400 uppercase tracking-wider block">
                活動日期與時間排程 *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-2">舉辦日期</label>
                  <CustomDatePicker value={dateStr} onChange={setDateStr} />
                </div>

                <TimeScroller label="開始時間" value={startTimeStr} onChange={setStartTimeStr} />
                <TimeScroller label="結束時間" value={endTimeStr} onChange={setEndTimeStr} />
              </div>
            </div>

            {/* 6. 地點資訊 */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <label className="block text-xs font-black text-zinc-300 mb-3">活動地區 *</label>
                <HKDistrictPicker
                  districts={districts}
                  subdistricts={subdistricts}
                  onDistrictsChange={setDistricts}
                  onSubdistrictsChange={setSubdistricts}
                  hideSectionTitle
                  minDistricts={0}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-300 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> 場地名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：維多利亞公園排球場 A 號場"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 mb-2">詳細地址 / 補充地標</label>
                <input
                  type="text"
                  placeholder="例：天后興發街 1 號 (天后站 A2 出口)"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
            </div>

            {/* 7. 名額、費用與紅旗規則 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
              <div>
                <label className="block text-xs font-black text-zinc-300 mb-2">
                  {registrationType === "individual" ? "人數上限 (含攜伴)" : "錄取球隊數上限"}
                </label>
                <input
                  type="number"
                  min="2"
                  placeholder="不填為無上限"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 mb-2">費用 (每人/每隊 HKD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> 紅旗退賽期限 (小時前)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={lateHours}
                  onChange={(e) => setLateHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* 8. 活動備註/介紹 */}
            <div>
              <label className="block text-xs font-black text-zinc-300 mb-2">活動介紹與報名須知</label>
              <textarea
                rows={4}
                placeholder="請說明程度要求（例：D1/D2 聯賽程度）、球具自備說明或取消退費規範..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* 送出按鈕 */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <Link
                href="/events"
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 font-bold text-sm transition cursor-pointer"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-sm transition shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> 發佈中...
                  </>
                ) : (
                  "確認發佈活動"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}