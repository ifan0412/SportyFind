"use client";

import Link from "next/link";
import { MapPin, Star, AlertCircle, Settings } from "lucide-react";
import {
  formatDistrictList,
  normalizeDistrictIds,
} from "@/lib/hk-locations";
import { RichBody } from "@/components/content/RichBody";
import { stripHtml } from "@/lib/content/body";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { normalizePhysioServiceTypes } from "@/lib/physio-service-types";
import { ServicePublishBadge } from "@/components/services/ServicePublishBadge";

export type ProfileRole = "athlete" | "coach" | "physio";
export type AthleteSubTab = "expertise" | "highlights" | "feed";

const PhysioStatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "available") {
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black">
      <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中
    </div>
  );
};

interface ProfileRolePreviewProps {
  profile: {
    id: string;
    full_name?: string | null;
    coach_bio?: string | null;
    is_coach?: boolean | null;
    is_physio?: boolean | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    city_region?: string | null;
    coach_districts?: string[] | null;
    address?: string | null;
    is_address_public?: boolean | null;
    coach_teaching_experience_years?: number | null;
    physio_qualifications?: string | null;
    clinic_name?: string | null;
    physio_experience_years?: string | null;
    physio_status?: string | null;
    physio_contact_email?: string | null;
    physio_contact_phone?: string | null;
    physio_city_region?: string | null;
    physio_districts?: string[] | null;
    physio_address?: string | null;
    physio_is_address_public?: boolean | null;
  };
  activeRole: ProfileRole;
  onRoleChange: (role: ProfileRole) => void;
  activeAthleteTab: AthleteSubTab;
  onAthleteTabChange: (tab: AthleteSubTab) => void;
  showPlayer: boolean;
  showCoach: boolean;
  showPhysio: boolean;
  coachServices: any[];
  physioServices: any[];
  coachReviews: { rating: number }[];
  athleteExpertise: React.ReactNode;
  athleteHighlights: React.ReactNode;
  athleteFeed: React.ReactNode;
  onCoachBackend?: () => void;
  onPhysioBackend?: () => void;
}

export function ProfileRolePreview({
  profile,
  activeRole,
  onRoleChange,
  activeAthleteTab,
  onAthleteTabChange,
  showPlayer,
  showCoach,
  showPhysio,
  coachServices,
  physioServices,
  coachReviews,
  athleteExpertise,
  athleteHighlights,
  athleteFeed,
  onCoachBackend,
  onPhysioBackend,
}: ProfileRolePreviewProps) {
  const avgCoachRating =
    coachReviews.length > 0
      ? (coachReviews.reduce((acc, r) => acc + r.rating, 0) / coachReviews.length).toFixed(1)
      : "5.0";

  return (
    <>
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-4 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {showPlayer && (
          <button
            type="button"
            onClick={() => onRoleChange("athlete")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${
              activeRole === "athlete"
                ? "bg-slate-50 text-black shadow-lg scale-[1.02]"
                : "text-zinc-500 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <span className="text-lg md:text-xl mb-0.5">👤</span>
            <span className="text-[10px] md:text-xs font-black leading-tight">運動員簡歷</span>
          </button>
        )}
        {showCoach && (
          <button
            type="button"
            onClick={() => onRoleChange("coach")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${
              activeRole === "coach"
                ? "bg-amber-500 text-black shadow-lg scale-[1.02]"
                : "text-zinc-500 hover:text-amber-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-lg md:text-xl mb-0.5">🎓</span>
            <span className="text-[10px] md:text-xs font-black leading-tight">簡介與專業</span>
          </button>
        )}
        {showPhysio && (
          <button
            type="button"
            onClick={() => onRoleChange("physio")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[100px] cursor-pointer ${
              activeRole === "physio"
                ? "bg-emerald-500 text-black shadow-lg scale-[1.02]"
                : "text-zinc-500 hover:text-emerald-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-lg md:text-xl mb-0.5">⚕️</span>
            <span className="text-[10px] md:text-xs font-black leading-tight">運動/物理治療</span>
          </button>
        )}
      </div>

      {activeRole === "coach" && onCoachBackend && (
        <button
          type="button"
          onClick={onCoachBackend}
          className="w-full mb-6 flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-sm transition bg-amber-600/15 border border-amber-500/30 text-amber-300 hover:bg-amber-600 hover:text-white hover:border-amber-600 cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <Settings className="w-4 h-4" />
            教練專屬後台管理
          </span>
          <span className="text-xs opacity-80">課程 · 名片 · 諮詢單 →</span>
        </button>
      )}

      {activeRole === "physio" && onPhysioBackend && (
        <button
          type="button"
          onClick={onPhysioBackend}
          className="w-full mb-6 flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-sm transition bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <Settings className="w-4 h-4" />
            治療師專屬後台管理
          </span>
          <span className="text-xs opacity-80">診療項目 · 名片 · 預約 →</span>
        </button>
      )}

      <div className="flex-1 animate-fadeIn">
        {activeRole === "athlete" && showPlayer && (
          <div className="space-y-6">
            <div className="flex gap-4 border-b border-slate-800 pb-2 px-2">
              {(
                [
                  { id: "expertise" as const, label: "技術特長" },
                  { id: "highlights" as const, label: "賽場圖庫" },
                  { id: "feed" as const, label: "個人動態" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onAthleteTabChange(tab.id)}
                  className={`text-sm font-black transition cursor-pointer ${
                    activeAthleteTab === tab.id
                      ? "text-white border-b-2 border-blue-500 pb-2 -mb-[9px]"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pt-2">
              {activeAthleteTab === "expertise" && athleteExpertise}
              {activeAthleteTab === "highlights" && athleteHighlights}
              {activeAthleteTab === "feed" && athleteFeed}
            </div>
          </div>
        )}

        {activeRole === "coach" && (
          <div className="space-y-6">
            {!showCoach ? (
              <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto" />
                <div className="text-base font-bold text-zinc-300">尚未開啟教練功能</div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">在左側編輯檔案時勾選「開啟教練管理功能」即可預覽此分頁。</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 max-w-2xl">
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <span>🎓</span> 專業教學導讀 (Coach Bio)
                    </h3>
                    <RichBody
                      html={profile.coach_bio}
                      emptyText="目前尚未填寫專屬的專業教學導讀。"
                      className="text-sm leading-relaxed"
                    />
                  </div>
                  <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800/80 text-center shrink-0 w-full md:w-auto">
                    <div className="text-xs font-bold text-zinc-500 mb-1">學員綜合總評</div>
                    <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1.5">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      {avgCoachRating}
                      <span className="text-xs text-zinc-500 font-normal">({coachReviews.length} 評價)</span>
                    </div>
                    <Link
                      href={`/p/${profile.id}?tab=coach`}
                      className="mt-4 w-full inline-flex justify-center bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600 hover:text-white font-black py-2.5 px-5 rounded-xl transition text-sm"
                    >
                      預覽公開頁面
                    </Link>
                  </div>
                </div>

                {(profile.contact_email ||
                  profile.contact_phone ||
                  profile.city_region ||
                  (profile.coach_districts && profile.coach_districts.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
                    <span className="font-black text-amber-400 flex items-center gap-1 shrink-0 mr-1">
                      <MapPin className="w-3.5 h-3.5" /> 授課據點與聯絡：
                    </span>
                    {(profile.coach_districts?.length || profile.city_region) && (
                      <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold">
                        📍{" "}
                        {formatDistrictList(
                          normalizeDistrictIds(profile.coach_districts, profile.city_region),
                          3
                        ) || profile.city_region}
                        {profile.is_address_public && profile.address && ` (${profile.address})`}
                      </span>
                    )}
                    {profile.coach_teaching_experience_years != null &&
                      profile.coach_teaching_experience_years > 0 && (
                        <span className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {profile.coach_teaching_experience_years} 年教學經驗
                        </span>
                      )}
                    {profile.contact_email && (
                      <span className="bg-blue-950/40 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl">
                        ✉️ {profile.contact_email}
                      </span>
                    )}
                    {profile.contact_phone && (
                      <span className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                        📞 {profile.contact_phone}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <h3 className="text-base md:text-lg font-black text-white mb-4">
                    開放預約課程 / 訓練服務 ({coachServices.length})
                  </h3>
                  {coachServices.length === 0 ? (
                    <p className="text-zinc-500 text-sm border border-dashed border-slate-800 rounded-2xl py-10 text-center">
                      尚未建立任何課程。前往教練後台新增。
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {coachServices.map((srv: any) => (
                        <div
                          key={srv.id}
                          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <SportCategoryBadge category={srv.sport_category} variant="amber" size="xs" />
                                <ServicePublishBadge isActive={!!srv.is_active} />
                              </div>
                              <span className="text-base font-black text-emerald-400">
                                HK$ {srv.hourly_rate}{" "}
                                <span className="text-xs text-zinc-500 font-normal">/小時</span>
                              </span>
                            </div>
                            <Link href={`/coaches/services/${srv.id}`} className="block">
                              <h4 className="text-lg font-black text-white group-hover:text-amber-400 transition line-clamp-1">
                                {srv.title || "未命名課程"}
                              </h4>
                            </Link>
                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                              {stripHtml(srv.description || "") || "點擊查看完整課程內容與學員評價"}
                            </p>
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              {formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) ||
                                "地點可商議"}
                            </div>
                          </div>
                          <div className="pt-4 mt-5 border-t border-slate-800/80">
                            {srv.is_active ? (
                              <Link
                                href={`/coaches/services/${srv.id}`}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-2xl transition shadow-[0_0_15px_rgba(217,119,6,0.3)] active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                              >
                                查看課程詳情 →
                              </Link>
                            ) : (
                              <p className="text-center text-xs font-bold text-zinc-500 py-2">
                                草稿 — 發佈後才會顯示於名師榜
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeRole === "physio" && (
          <div className="space-y-6">
            {!showPhysio ? (
              <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto" />
                <div className="text-base font-bold text-zinc-300">尚未開啟物理治療功能</div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">在左側編輯檔案時勾選「開啟運動/物理治療功能」即可預覽此分頁。</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 max-w-2xl">
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <span>⚕️</span> 治療師專業簡介
                    </h3>
                    <RichBody
                      html={profile.physio_qualifications}
                      emptyText="目前尚未填寫專業資歷與簡介。"
                      className="text-sm leading-relaxed"
                    />
                    {profile.clinic_name && (
                      <p className="text-xs text-zinc-500 font-bold">
                        所屬：{profile.clinic_name}
                        {profile.physio_experience_years
                          ? ` · ${profile.physio_experience_years} 年經驗`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800/80 text-center shrink-0 w-full md:w-auto">
                    <PhysioStatusBadge tag={profile.physio_status ?? null} />
                    <Link
                      href={`/p/${profile.id}?tab=physio`}
                      className="mt-4 w-full inline-flex justify-center bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white font-black py-2.5 px-5 rounded-xl transition text-sm"
                    >
                      預覽公開頁面
                    </Link>
                  </div>
                </div>

                {(profile.physio_contact_email ||
                  profile.physio_contact_phone ||
                  profile.physio_city_region ||
                  (profile.physio_districts && profile.physio_districts.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
                    <span className="font-black text-emerald-400 flex items-center gap-1 shrink-0 mr-1">
                      <MapPin className="w-3.5 h-3.5" /> 服務據點與聯絡：
                    </span>
                    {(profile.physio_districts?.length || profile.physio_city_region) && (
                      <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-zinc-200 font-bold">
                        📍{" "}
                        {formatDistrictList(
                          normalizeDistrictIds(profile.physio_districts, profile.physio_city_region),
                          3
                        ) || profile.physio_city_region}
                        {profile.physio_is_address_public &&
                          profile.physio_address &&
                          ` (${profile.physio_address})`}
                      </span>
                    )}
                    {profile.physio_contact_email && (
                      <span className="bg-blue-950/40 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl">
                        ✉️ {profile.physio_contact_email}
                      </span>
                    )}
                    {profile.physio_contact_phone && (
                      <span className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                        📞 {profile.physio_contact_phone}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <h3 className="text-base md:text-lg font-black text-white mb-4">
                    診療項目 / 服務 ({physioServices.length})
                  </h3>
                  {physioServices.length === 0 ? (
                    <p className="text-zinc-500 text-sm border border-dashed border-slate-800 rounded-2xl py-10 text-center">
                      尚未建立任何診療項目。前往治療師後台新增。
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {physioServices.map((srv: any) => (
                        <div
                          key={srv.id}
                          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <PhysioServiceTypeBadges types={normalizePhysioServiceTypes(srv.service_types, srv.service_type)} size="xs" />
                                <ServicePublishBadge isActive={!!srv.is_active} />
                              </div>
                              <span className="text-base font-black text-emerald-400">
                                HK$ {srv.session_rate}{" "}
                                <span className="text-xs text-zinc-500 font-normal">/節</span>
                              </span>
                            </div>
                            <Link href={`/physio/services/${srv.id}`} className="block">
                              <h4 className="text-lg font-black text-white group-hover:text-emerald-400 transition line-clamp-1">
                                {srv.title || "未命名項目"}
                              </h4>
                            </Link>
                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                              {stripHtml(srv.description || "") || "點擊查看完整診療內容與評價"}
                            </p>
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              {formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) ||
                                "地點可商議"}
                            </div>
                          </div>
                          <div className="pt-4 mt-5 border-t border-slate-800/80">
                            {srv.is_active ? (
                              <Link
                                href={`/physio/services/${srv.id}`}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-2xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                              >
                                查看項目詳情 →
                              </Link>
                            ) : (
                              <p className="text-center text-xs font-bold text-zinc-500 py-2">
                                草稿 — 發佈後才會顯示於名錄
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
