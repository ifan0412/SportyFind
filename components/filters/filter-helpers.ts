import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import { HK_AREAS } from "@/lib/hk-locations";
import type { LocationFilterOption } from "@/components/LocationFilterModal";
import type { MobileFilterCategory, MobileFilterValues } from "./types";
import { PHYSIO_SERVICE_TYPES } from "@/lib/physio-service-types";

export function sportFilterCategory(id = "sports", label = "項目"): MobileFilterCategory {
  return {
    id,
    label,
    type: "multi",
    options: SPORT_CATEGORIES.map((s) => ({
      id: s.id,
      label: `${s.emoji} ${s.labelZh}`,
    })),
  };
}

export function locationFilterCategory(
  allLocations: LocationFilterOption[],
  id = "districts",
  label = "地區"
): MobileFilterCategory {
  return {
    id,
    label,
    type: "multi",
    groups: HK_AREAS.map((area) => ({
      label: area.labelZh,
      options: allLocations
        .filter((l) => l.area === area.id)
        .map((l) => ({
          id: l.id,
          label: l.label.split(" ")[0],
        })),
    })).filter((g) => g.options.length > 0),
  };
}

export function physioServiceTypeCategory(): MobileFilterCategory {
  return {
    id: "serviceTypes",
    label: "診療類別",
    type: "multi",
    options: PHYSIO_SERVICE_TYPES.map((t) => ({ id: t, label: t })),
  };
}

export function singleSelectCategory(
  id: string,
  label: string,
  options: { id: string; label: string }[]
): MobileFilterCategory {
  return { id, label, type: "single", options };
}

export function multiSelectCategory(
  id: string,
  label: string,
  options: { id: string; label: string }[]
): MobileFilterCategory {
  return { id, label, type: "multi", options };
}

export function countActiveMobileFilters(
  categories: MobileFilterCategory[],
  values: MobileFilterValues
): number {
  let count = 0;
  for (const cat of categories) {
    const val = values[cat.id];
    if (cat.type === "single") {
      if (typeof val === "string" && val !== "all" && val !== "") count += 1;
    } else if (Array.isArray(val) && val.length > 0) {
      count += 1;
    }
  }
  return count;
}

export function categorySelectionCount(
  category: MobileFilterCategory,
  values: MobileFilterValues
): number {
  const val = values[category.id];
  if (category.type === "single") {
    return typeof val === "string" && val !== "all" && val !== "" ? 1 : 0;
  }
  return Array.isArray(val) ? val.length : 0;
}
