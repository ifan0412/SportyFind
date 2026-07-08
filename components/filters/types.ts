export type MobileFilterSelectMode = "multi" | "single";

export interface MobileFilterOption {
  id: string;
  label: string;
}

export interface MobileFilterOptionGroup {
  label: string;
  options: MobileFilterOption[];
}

export interface MobileFilterCategory {
  id: string;
  label: string;
  type: MobileFilterSelectMode;
  options?: MobileFilterOption[];
  groups?: MobileFilterOptionGroup[];
}

export type MobileFilterAccent = "blue" | "orange" | "green" | "yellow" | "amber" | "purple";

export type MobileFilterValues = Record<string, string | string[]>;
