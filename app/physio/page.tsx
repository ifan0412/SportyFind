"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/BackButton";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import { PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { aggregatePhysioServiceTypes } from "@/lib/physio-service-types";
import {
  districtsForFilterModal,
  formatDistrictList,
  normalizeDistrictIds,
  profileMatchesDistrictFilter,
} from "@/lib/hk-locations";

interface PhysioProfile {
  id: string;
  full_name: string;
  physio_region: string;
  physio_districts: string[] | null;
  physio_status: string;
  clinic_name: string;
  physio_rate: number;
  avatar_url: string | null;
}

function PhysioStatusBadge({ tag }: { tag: string | null }) {
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs px-2.5 py-1 rounded-full font-black tracking-widest whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿診中</div>;
  return null;
}

export default function PhysioPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [physios, setPhysios] = useState<PhysioProfile[]>([]);
  const [serviceTypesByPhysio, setServiceTypesByPhysio] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const locationOptions = useMemo(() => districtsForFilterModal(), []);

  useEffect(() => {
    const fetchPhysios = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      let query = supabase
        .from("profiles")
        .select("id, full_name, physio_region, physio_districts, physio_status, clinic_name, physio_rate, avatar_url")
        .eq("is_physio", true)
        .neq("physio_status", "hidden");

      if (currentUserId) {
        query = query.neq("id", currentUserId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setPhysios(data as PhysioProfile[]);
        const physioIds = data.map((p) => p.id);
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
            typesMap[physioId] = aggregatePhysioServiceTypes(srvList);
          }
          setServiceTypesByPhysio(typesMap);
        }
      }
      setIsLoading(false);
    };
    fetchPhysios();
  }, [supabase]);

  const filteredPhysios = physios.filter(p => {
    const matchSearch = (p.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.clinic_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const districts = normalizeDistrictIds(p.physio_districts, p.physio_region);
    const matchLocation = profileMatchesDistrictFilter(districts, p.physio_region, selectedDistricts);
    const matchStatus = filterStatus ? p.physio_status === filterStatus : true;
    return matchSearch && matchLocation && matchStatus;
  });

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-emerald-500/30 pb-24 relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        
        <BackButton label="返回上一頁" />

        <div className="mb-6 md:mb-8 text-center md:text-left mt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">運動/物理治療 ⚕️</h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">尋找專業物理治療師與運動按摩，加速你的賽後恢復。</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 md:p-5 rounded-3xl mb-8 shadow-lg flex flex-col md:flex-row gap-4 items-center">
          
          <div className="relative w-full md:flex-1">
            <span className="absolute left-3 top-3 text-zinc-500">🔍</span>
            <input type="text" placeholder="搜尋專家名稱、診所..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
          </div>

          <button onClick={() => setIsLocationModalOpen(true)} className={`w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition flex-shrink-0 ${selectedDistricts.length > 0 ? "bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>
            <span>地區 {selectedDistricts.length > 0 ? `(${selectedDistricts.length})` : "(全區)"}</span><span className="text-[10px]">▼</span>
          </button>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden w-full md:w-auto">
            <button onClick={() => setFilterStatus("")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${!filterStatus ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>全部狀態</button>
            <button onClick={() => setFilterStatus("available")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "available" ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🟢 開放預約</button>
            <button onClick={() => setFilterStatus("busy")} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition ${filterStatus === "busy" ? "bg-slate-100 border-slate-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-slate-950 border-slate-700 text-zinc-400 hover:border-slate-500"}`}>🔴 滿診中</button>
          </div>
        </div>

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
                return (
                  <div key={p.id} className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition duration-300" />
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-5 mt-2">
                      <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-600 bg-cover bg-center shadow-inner" style={{ backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : "none" }}>{!p.avatar_url && (p.full_name?.[0] || "P")}</div>
                      <div className="absolute -bottom-3 flex justify-center w-full"><PhysioStatusBadge tag={p.physio_status} /></div>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight mb-1 truncate w-full">{p.full_name || "專家名稱未設"}</h3>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium mb-4 line-clamp-2 h-8 md:h-10 leading-snug">{p.clinic_name || "獨立接案"}</p>
                    <div className="flex flex-col items-center gap-2 mb-6 w-full">
                      {serviceTypes.length > 0 && (
                        <PhysioServiceTypeBadges types={serviceTypes} size="xs" max={5} />
                      )}
                      <div className="inline-flex items-center gap-1 bg-slate-950/50 border border-slate-800/80 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg">📍 {districtLabel}</div>
                    </div>
                    <div className="mt-auto w-full pt-4 border-t border-slate-800/80">
                      <Link href={`/p/${p.id}?tab=physio`} className="block w-full bg-slate-800 hover:bg-emerald-600 text-white text-sm font-black py-3 rounded-xl transition duration-300">查看專頁</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LocationFilterModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        allLocations={locationOptions}
        selectedLocations={selectedDistricts}
        onApply={setSelectedDistricts}
      />
    </div>
  );
}
