"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  HK_AREAS,
  HK_DISTRICTS,
  type HKArea,
  type HKDistrict,
} from "@/lib/hk-locations";

interface HKDistrictPickerProps {
  districts: string[];
  subdistricts: string[];
  onDistrictsChange: (districts: string[]) => void;
  onSubdistrictsChange: (subdistricts: string[]) => void;
  /** Prefer this when both districts and subdistricts update together (avoids stale state overwrites). */
  onSelectionChange?: (districts: string[], subdistricts: string[]) => void;
  showSubdistricts?: boolean;
  minDistricts?: number;
  /** Collapse region groups by default; click header to expand */
  collapsible?: boolean;
  /** Hide the built-in section title (when parent already labels the field) */
  hideSectionTitle?: boolean;
}

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer";

export function HKDistrictPicker({
  districts,
  subdistricts,
  onDistrictsChange,
  onSubdistrictsChange,
  onSelectionChange,
  showSubdistricts = true,
  minDistricts = 0,
  collapsible = true,
  hideSectionTitle = false,
}: HKDistrictPickerProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<HKArea>>(new Set());
  const [subdistrictsOpen, setSubdistrictsOpen] = useState(false);
  const [expandedSubDistricts, setExpandedSubDistricts] = useState<Set<string>>(new Set());

  const selectedDistrictRows = useMemo(() => {
    return districts
      .map((dId) => HK_DISTRICTS.find((x) => x.id === dId))
      .filter((d): d is HKDistrict => Boolean(d));
  }, [districts]);

  const applySelection = (nextDistricts: string[], nextSubdistricts: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(nextDistricts, nextSubdistricts);
      return;
    }
    onDistrictsChange(nextDistricts);
    onSubdistrictsChange(nextSubdistricts);
  };

  const toggleDistrict = (id: string) => {
    if (districts.includes(id)) {
      if (minDistricts > 0 && districts.length <= minDistricts) return;
      const nextDistricts = districts.filter((d) => d !== id);
      const removedSubs =
        HK_DISTRICTS.find((d) => d.id === id)?.subdistricts.map((s) => s.id) || [];
      const nextSubdistricts = subdistricts.filter((s) => !removedSubs.includes(s));
      applySelection(nextDistricts, nextSubdistricts);
      setExpandedSubDistricts((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    } else {
      applySelection([...districts, id], subdistricts);
    }
  };

  const toggleSubdistrict = (id: string) => {
    if (subdistricts.includes(id)) {
      applySelection(districts, subdistricts.filter((s) => s !== id));
    } else {
      applySelection(districts, [...subdistricts, id]);
    }
  };

  const toggleArea = (areaId: HKArea) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const toggleSubDistrictGroup = (districtId: string) => {
    setExpandedSubDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(districtId)) next.delete(districtId);
      else next.add(districtId);
      return next;
    });
  };

  const grouped = HK_AREAS.map((area) => ({
    ...area,
    districts: HK_DISTRICTS.filter((d) => d.area === area.id),
  }));

  const renderDistrictChips = (items: HKDistrict[]) => (
    <div className="flex flex-wrap gap-2">
      {items.map((d) => {
        const selected = districts.includes(d.id);
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => toggleDistrict(d.id)}
            className={`${chipBase} ${
              selected
                ? "bg-amber-600/20 border-amber-500 text-amber-300"
                : "bg-slate-950 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-600"
            }`}
          >
            {d.labelZh}
          </button>
        );
      })}
    </div>
  );

  const selectedSubCount = subdistricts.length;

  return (
    <div className="space-y-3">
      <div>
        {!hideSectionTitle && (
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-2">
            選擇地區（可多選）
          </p>
        )}
        <div className={collapsible ? "space-y-2" : "space-y-4"}>
          {grouped.map((group) => {
            const selectedInArea = group.districts.filter((d) => districts.includes(d.id)).length;
            const isExpanded = !collapsible || expandedAreas.has(group.id);

            if (collapsible) {
              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleArea(group.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-zinc-300 truncate">
                        {group.labelZh}
                        <span className="text-zinc-600 font-normal ml-1">· {group.labelEn}</span>
                      </span>
                    </div>
                    {selectedInArea > 0 && (
                      <span className="text-[10px] font-black text-amber-400 shrink-0">
                        {selectedInArea} 已選
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0">{renderDistrictChips(group.districts)}</div>
                  )}
                </div>
              );
            }

            return (
              <div key={group.id}>
                <p className="text-[10px] font-bold text-zinc-600 mb-2">
                  {group.labelZh} · {group.labelEn}
                </p>
                {renderDistrictChips(group.districts)}
              </div>
            );
          })}
        </div>
      </div>

      {showSubdistricts && districts.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setSubdistrictsOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-900/60 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              {subdistrictsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              )}
              <span className="text-xs font-bold text-zinc-300">
                細分區域（選填）
              </span>
            </div>
            {selectedSubCount > 0 && (
              <span className="text-[10px] font-black text-blue-400 shrink-0">
                {selectedSubCount} 已選
              </span>
            )}
          </button>

          {subdistrictsOpen && (
            <div className="px-3 pb-3 space-y-2">
              {selectedDistrictRows.map((parent) => {
                const subs = parent.subdistricts;
                if (!subs.length) return null;

                const selectedInParent = subs.filter((s) => subdistricts.includes(s.id)).length;
                const groupOpen = expandedSubDistricts.has(parent.id);

                return (
                  <div
                    key={parent.id}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/60 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubDistrictGroup(parent.id)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-slate-900/50 transition"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {groupOpen ? (
                          <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                        )}
                        <span className="text-[11px] font-bold text-amber-400/90 truncate">
                          {parent.labelZh}
                        </span>
                      </div>
                      {selectedInParent > 0 && (
                        <span className="text-[9px] font-black text-blue-400 shrink-0">
                          {selectedInParent}
                        </span>
                      )}
                    </button>
                    {groupOpen && (
                      <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                        {subs.map((s) => {
                          const selected = subdistricts.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSubdistrict(s.id)}
                              className={`${chipBase} ${
                                selected
                                  ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                  : "bg-slate-950 border-slate-800 text-zinc-500 hover:text-white hover:border-slate-600"
                              }`}
                            >
                              {s.labelZh}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(districts.length > 0 || subdistricts.length > 0) && (
        <p className="text-[11px] text-zinc-600">
          已選 {districts.length} 個地區
          {subdistricts.length > 0 && ` · ${subdistricts.length} 個細分區`}
        </p>
      )}
    </div>
  );
}

export function getAreaLabel(area: HKArea): string {
  return HK_AREAS.find((a) => a.id === area)?.labelZh || area;
}
