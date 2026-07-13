"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { ListingPageHeader } from "@/components/listing/ListingPageHeader";
import { LISTING_PAGE_MAX_WIDTH, LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import { PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { PhysioServiceTypeFilterModal } from "@/components/physio/PhysioServiceTypeFilterModal";
import { normalizePhysioServiceTypes } from "@/lib/physio-service-types";
import { filterPhysioQualificationTags } from "@/lib/qualifications";
import { QualificationBadges } from "@/components/qualifications/QualificationBadges";
import {
  districtsForFilterModal,
  formatDistrictList,
  normalizeDistrictIds,
  serviceMatchesDistrictFilter,
} from "@/lib/hk-locations";
import { MapPin, User as UserIcon } from "lucide-react";
import { PhoneVerifiedAvatarBadge } from "@/components/profile/PhoneVerifiedBadge";
import { ListingFilterBar } from "@/components/filters/ListingFilterBar";
import { ScrollRevealFilterShell } from "@/components/filters/ScrollRevealFilterShell";
import { MobileFilterSheet } from "@/components/filters/MobileFilterSheet";
import { useMobileFilterDraft } from "@/components/filters/useMobileFilterDraft";
import {
  countActiveMobileFilters,
  locationFilterCategory,
  physioServiceTypeCategory,
} from "@/components/filters/filter-helpers";
import type { MobileFilterValues } from "@/components/filters/types";
import { formatPhysioServicePrice } from "@/lib/coach-pricing";
import { stripHtml } from "@/lib/content/body";

interface PhysioServiceRow {
  id: string;
  physio_id: string;
  title: string;
  description: string | null;
  location: string | null;
  districts: string[] | null;
  subdistricts: string[] | null;
  service_type: string | null;
  service_types: string[] | null;
  session_rate: number | null;
  pricing_mode: string | null;
  profiles: {
    full_name: string;
    clinic_name: string | null;
    avatar_url: string | null;
    physio_status: string | null;
    physio_experience_years: string | null;
    physio_qualification_tags: string[] | null;
    phone_verified_at: string | null;
    is_physio?: boolean | null;
  } | null;
}

function PhysioStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "available") {
    return (
      <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 開放預約
      </div>
    );
  }
  if (tag === "busy" || tag === "full") {
    return (
      <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest whitespace-nowrap">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中
      </div>
    );
  }
  return null;
}

export default function PhysioPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [services, setServices] = useState<PhysioServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const locationOptions = useMemo(() => districtsForFilterModal(), []);

  const mobileFilterCategories = useMemo(
    () => [
      locationFilterCategory(locationOptions, "districts", "地區"),
      physioServiceTypeCategory(),
    ],
    [locationOptions]
  );

  const appliedMobileFilters: MobileFilterValues = useMemo(
    () => ({ districts: selectedDistricts, serviceTypes: selectedServiceTypes }),
    [selectedDistricts, selectedServiceTypes]
  );

  const mobileFilters = useMobileFilterDraft(appliedMobileFilters);

  const applyMobileFilters = () => {
    const d = mobileFilters.draft;
    setSelectedDistricts(Array.isArray(d.districts) ? d.districts : []);
    setSelectedServiceTypes(Array.isArray(d.serviceTypes) ? d.serviceTypes : []);
    mobileFilters.close();
  };

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      let query = supabase
        .from("physio_services")
        .select(`
          id, physio_id, title, description, location,
          districts, subdistricts, service_type, service_types, session_rate, pricing_mode,
          profiles!physio_id (
            full_name, clinic_name, avatar_url, physio_status, physio_experience_years,
            physio_qualification_tags, phone_verified_at, is_physio
          )
        `)
        .eq("is_active", true)
        .eq("show_on_listing", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (currentUserId) query = query.neq("physio_id", currentUserId);

      const { data, error } = await query;

      if (!error && data) {
        const rows = (data as unknown as PhysioServiceRow[]).filter((srv) => {
          const profile = srv.profiles;
          if (!profile?.is_physio) return false;
          if (profile.physio_status === "hidden") return false;
          return true;
        });
        setServices(rows);
      } else if (error?.message?.includes("show_on_listing")) {
        let fallbackQuery = supabase
          .from("physio_services")
          .select(`
            id, physio_id, title, description, location,
            districts, subdistricts, service_type, service_types, session_rate, pricing_mode,
            profiles!physio_id (
              full_name, clinic_name, avatar_url, physio_status, physio_experience_years,
              physio_qualification_tags, phone_verified_at, is_physio
            )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (currentUserId) fallbackQuery = fallbackQuery.neq("physio_id", currentUserId);
        const { data: fallback } = await fallbackQuery;
        if (fallback) {
          setServices(
            (fallback as unknown as PhysioServiceRow[]).filter((srv) => {
              const profile = srv.profiles;
              return profile?.is_physio && profile.physio_status !== "hidden";
            })
          );
        }
      } else {
        console.error("Failed to load physio services:", error?.message);
        setServices([]);
      }
      setIsLoading(false);
    };
    fetchServices();
  }, [supabase]);

  const filteredServices = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return services.filter((srv) => {
      const types = normalizePhysioServiceTypes(srv.service_types, srv.service_type);
      const matchSearch =
        !q ||
        (srv.title || "").toLowerCase().includes(q) ||
        (srv.profiles?.full_name || "").toLowerCase().includes(q) ||
        (srv.profiles?.clinic_name || "").toLowerCase().includes(q);
      const districts = normalizeDistrictIds(srv.districts, srv.location);
      const matchLocation = serviceMatchesDistrictFilter(districts, srv.location, selectedDistricts);
      const matchType =
        selectedServiceTypes.length === 0 ||
        selectedServiceTypes.some((t) => types.includes(t));
      return matchSearch && matchLocation && matchType;
    });
  }, [services, searchTerm, selectedDistricts, selectedServiceTypes]);

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-green-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <ListingPageHeader section="physio" />

        <ScrollRevealFilterShell className="mb-8">
        <ListingFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="搜尋項目或治療師..."
          onFilterOpen={mobileFilters.open}
          hasActiveFilters={countActiveMobileFilters(mobileFilterCategories, appliedMobileFilters) > 0}
          accent="green"
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-3 rounded-3xl mb-6 shadow-lg"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
              <input
                type="text"
                placeholder="搜尋項目名稱、治療師或診所..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-green-500 transition"
              />
            </div>

            <button type="button" onClick={() => setIsLocationModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${selectedDistricts.length > 0 ? "bg-green-600/10 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
              <span>地區 {selectedDistricts.length > 0 ? `(${selectedDistricts.length})` : "(全區)"}</span><span className="text-[10px]">▼</span>
            </button>

            <button type="button" onClick={() => setIsServiceTypeModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${selectedServiceTypes.length > 0 ? "bg-green-600/10 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
              <span>診療類別 {selectedServiceTypes.length > 0 ? `(${selectedServiceTypes.length})` : "(全部)"}</span><span className="text-[10px]">▼</span>
            </button>
          </div>
        </ListingFilterBar>
        </ScrollRevealFilterShell>

        <div>
          <div className="mb-4 px-1">
            <span className="text-sm font-bold text-zinc-500">
              顯示 <span className="text-white">{filteredServices.length}</span> 項診療項目
            </span>
          </div>
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋醫療資源庫中...</div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4">
              <p className="text-zinc-400 font-bold text-sm">沒有符合條件的診療項目。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredServices.map((srv) => {
                const districts = normalizeDistrictIds(srv.districts, srv.location);
                const districtLabel = formatDistrictList(districts, 2) || "地點未設";
                const serviceTypes = normalizePhysioServiceTypes(srv.service_types, srv.service_type);
                const qualificationTags = filterPhysioQualificationTags(
                  srv.profiles?.physio_qualification_tags
                );

                return (
                  <div
                    key={srv.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-green-500/40 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <PhysioServiceTypeBadges types={serviceTypes} size="sm" max={2} />
                        {(() => {
                          const p = formatPhysioServicePrice(srv);
                          return (
                            <span className={`text-base font-black shrink-0 ${p.isDm ? "text-zinc-400" : "text-green-400"}`}>
                              {p.main}
                              {p.unit && (
                                <span className="text-xs text-zinc-500 font-normal ml-0.5">{p.unit}</span>
                              )}
                            </span>
                          );
                        })()}
                      </div>

                      <Link href={`/p/${srv.physio_id}?tab=physio`} className="flex items-center gap-3 group/physio">
                        <div className="relative shrink-0 overflow-visible">
                          <div
                            className="w-14 h-14 rounded-full bg-slate-800 bg-cover bg-center border-2 border-slate-700 flex items-center justify-center overflow-hidden"
                            style={
                              srv.profiles?.avatar_url
                                ? { backgroundImage: `url(${srv.profiles.avatar_url})` }
                                : undefined
                            }
                          >
                            {!srv.profiles?.avatar_url && <UserIcon className="w-6 h-6 text-zinc-500" />}
                          </div>
                          <PhoneVerifiedAvatarBadge verifiedAt={srv.profiles?.phone_verified_at} />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 scale-90 origin-bottom">
                            <PhysioStatusBadge tag={srv.profiles?.physio_status ?? null} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-0.5">
                            物理治療師
                          </div>
                          <div className="text-lg font-black text-white group-hover/physio:text-green-400 transition truncate leading-tight">
                            {srv.profiles?.full_name || "專業治療師"}
                          </div>
                          <div className="text-xs text-zinc-400 font-medium truncate">
                            {srv.profiles?.clinic_name || "獨立接案"}
                          </div>
                        </div>
                      </Link>

                      {qualificationTags.length > 0 && (
                        <QualificationBadges tags={qualificationTags} accent="green" size="xs" max={3} align="left" />
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800">
                          <MapPin className="w-3 h-3 text-green-400 shrink-0" />
                          {districtLabel}
                        </span>
                        {srv.profiles?.physio_experience_years && (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            {srv.profiles.physio_experience_years} 年經驗
                          </span>
                        )}
                      </div>

                      <div>
                        <Link href={`/physio/services/${srv.id}`} className="block">
                          <h3 className="text-sm font-bold text-zinc-300 group-hover:text-green-400 transition line-clamp-2 leading-snug">
                            {srv.title || "未命名項目"}
                          </h3>
                        </Link>
                        {srv.description && (
                          <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-snug">
                            {stripHtml(srv.description)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-800/80 grid grid-cols-2 gap-2.5">
                      <Link
                        href={`/p/${srv.physio_id}?tab=physio`}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 hover:text-white font-bold text-xs text-center transition"
                      >
                        了解治療師
                      </Link>
                      <Link
                        href={`/physio/services/${srv.id}`}
                        className="py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs text-center transition flex items-center justify-center gap-1"
                      >
                        項目詳情 →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <MobileFilterSheet
        isOpen={mobileFilters.isOpen}
        categories={mobileFilterCategories}
        values={mobileFilters.draft}
        onChange={mobileFilters.setDraft}
        onCancel={mobileFilters.cancel}
        onApply={applyMobileFilters}
        accent="green"
      />

      <LocationFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        allLocations={locationOptions}
        selectedLocations={selectedDistricts}
        onApply={setSelectedDistricts}
      />

      <PhysioServiceTypeFilterModal
        isOpen={isServiceTypeModalOpen}
        onClose={() => setIsServiceTypeModalOpen(false)}
        selectedTypes={selectedServiceTypes}
        onApply={setSelectedServiceTypes}
      />
    </div>
  );
}
