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
import { physioCardServiceTags } from "@/lib/physio-service-types";
import { filterPhysioQualificationTags } from "@/lib/qualifications";
import { QualificationBadges } from "@/components/qualifications/QualificationBadges";
import {
  districtsForFilterModal,
  formatDistrictList,
  normalizeDistrictIds,
  profileMatchesDistrictFilter,
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

interface PhysioProfile {
  id: string;
  full_name: string;
  physio_region: string;
  physio_districts: string[] | null;
  physio_status: string;
  clinic_name: string | null;
  physio_rate: number;
  avatar_url: string | null;
  physio_experience_years: string | null;
  physio_service_tags?: string[] | null;
  physio_qualification_tags?: string[] | null;
  phone_verified_at?: string | null;
}

function PhysioStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy" || tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中</div>;
  return null;
}

const PROFILE_SELECT =
  "id, full_name, physio_region, physio_districts, physio_status, clinic_name, physio_rate, avatar_url, physio_experience_years, phone_verified_at";

export default function PhysioPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [physios, setPhysios] = useState<PhysioProfile[]>([]);
  const [serviceTypesByPhysio, setServiceTypesByPhysio] = useState<Record<string, string[]>>({});
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
    const fetchPhysios = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      let query = supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("is_physio", true)
        .neq("physio_status", "hidden");

      if (currentUserId) {
        query = query.neq("id", currentUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load physios:", error.message);
        setPhysios([]);
        setIsLoading(false);
        return;
      }

      if (data) {
        const rows = data as PhysioProfile[];

        const { data: tagRows } = await supabase
          .from("profiles")
          .select("id, physio_service_tags, physio_qualification_tags")
          .in("id", rows.map((p) => p.id));
        if (tagRows) {
          const tagMap = new Map(tagRows.map((r) => [r.id, r]));
          for (const p of rows) {
            const extra = tagMap.get(p.id);
            if (extra) {
              p.physio_service_tags = extra.physio_service_tags ?? null;
              p.physio_qualification_tags = extra.physio_qualification_tags ?? null;
            }
          }
        }

        setPhysios(rows);
        const physioIds = rows.map((p) => p.id);
        if (physioIds.length) {
          const { data: services } = await supabase
            .from("physio_services")
            .select("physio_id, service_type, service_types")
            .in("physio_id", physioIds)
            .eq("is_active", true);
          const byPhysio: Record<string, { service_types?: unknown; service_type?: string | null }[]> = {};
          for (const srv of services || []) {
            if (!byPhysio[srv.physio_id]) byPhysio[srv.physio_id] = [];
            byPhysio[srv.physio_id].push(srv);
          }
          const typesMap: Record<string, string[]> = {};
          for (const [physioId, srvList] of Object.entries(byPhysio)) {
            const profile = rows.find((p) => p.id === physioId);
            typesMap[physioId] = physioCardServiceTags(
              profile?.physio_service_tags,
              null,
              srvList
            );
          }
          setServiceTypesByPhysio(typesMap);
        }
      }
      setIsLoading(false);
    };
    fetchPhysios();
  }, [supabase]);

  const filteredPhysios = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return physios.filter((p) => {
      const matchSearch =
        !q ||
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.clinic_name || "").toLowerCase().includes(q);
      const districts = normalizeDistrictIds(p.physio_districts, p.physio_region);
      const matchLocation = profileMatchesDistrictFilter(districts, p.physio_region, selectedDistricts);
      const types = serviceTypesByPhysio[p.id] || [];
      const matchType =
        selectedServiceTypes.length === 0 ||
        selectedServiceTypes.some((t) => types.includes(t));
      return matchSearch && matchLocation && matchType;
    });
  }, [physios, searchTerm, selectedDistricts, selectedServiceTypes, serviceTypesByPhysio]);

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-green-500/30 pb-24 relative">
      <div className={`${LISTING_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 lg:px-8 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <ListingPageHeader section="physio" />

        <ScrollRevealFilterShell className="mb-8">
        <ListingFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="搜尋專家或診所..."
          onFilterOpen={mobileFilters.open}
          hasActiveFilters={countActiveMobileFilters(mobileFilterCategories, appliedMobileFilters) > 0}
          accent="green"
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-3 rounded-3xl mb-6 shadow-lg"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
              <input type="text" placeholder="搜尋專家名稱、診所..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-green-500 transition" />
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
          <div className="mb-4 px-1 flex justify-between items-center"><span className="text-sm font-bold text-zinc-500">顯示 <span className="text-white">{filteredPhysios.length}</span> 位專家</span></div>
          {isLoading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">搜尋醫療資源庫中...</div>
          ) : filteredPhysios.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-20 text-center px-4"><p className="text-zinc-400 font-bold text-sm">沒有符合條件的專家檔案。</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 animate-fadeIn">
              {filteredPhysios.map((p) => {
                const districtLabel = formatDistrictList(normalizeDistrictIds(p.physio_districts, p.physio_region), 2) || "地點未設";
                const serviceTypes = serviceTypesByPhysio[p.id] || [];
                const qualificationTags = filterPhysioQualificationTags(p.physio_qualification_tags);

                return (
                  <div
                    key={p.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-green-500/40 rounded-3xl p-5 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl"
                  >
                    <div className="space-y-3">
                      <Link href={`/p/${p.id}?tab=physio`} className="flex items-center gap-3 group/physio">
                        <div className="relative shrink-0 overflow-visible">
                          <div
                            className="w-14 h-14 rounded-full bg-slate-800 bg-cover bg-center border-2 border-slate-700 flex items-center justify-center overflow-hidden"
                            style={p.avatar_url ? { backgroundImage: `url(${p.avatar_url})` } : undefined}
                          >
                            {!p.avatar_url && <UserIcon className="w-6 h-6 text-zinc-500" />}
                          </div>
                          <PhoneVerifiedAvatarBadge verifiedAt={p.phone_verified_at} />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 scale-90 origin-bottom">
                            <PhysioStatusBadge tag={p.physio_status} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-0.5">物理治療師</div>
                          <div className="text-lg font-black text-white group-hover/physio:text-green-400 transition truncate leading-tight">
                            {p.full_name || "專家名稱未設"}
                          </div>
                          <div className="text-xs text-zinc-400 font-medium truncate">{p.clinic_name || "獨立接案"}</div>
                        </div>
                      </Link>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.physio_experience_years && (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
                            {p.physio_experience_years} 年經驗
                          </span>
                        )}
                        {serviceTypes.length > 0 && (
                          <PhysioServiceTypeBadges types={serviceTypes} size="xs" max={3} />
                        )}
                        {qualificationTags.length > 0 && (
                          <QualificationBadges tags={qualificationTags} accent="green" size="xs" max={2} />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800">
                          <MapPin className="w-3 h-3 text-green-400 shrink-0" />
                          {districtLabel}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-800/80">
                      <Link
                        href={`/p/${p.id}?tab=physio`}
                        className="block w-full bg-slate-800 hover:bg-green-600 text-white text-sm font-black py-2.5 rounded-xl transition duration-300 text-center"
                      >
                        查看專頁
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
