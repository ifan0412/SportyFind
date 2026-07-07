export type ServicePricingMode = "hourly" | "session" | "dm";
export type CoachPricingMode = ServicePricingMode;

export const SERVICE_PRICING_MODES: {
  id: ServicePricingMode;
  label: string;
  unitLabel: string;
}[] = [
  { id: "hourly", label: "按小時", unitLabel: "HKD / 小時" },
  { id: "session", label: "按節", unitLabel: "HKD / 節" },
  { id: "dm", label: "私訊詢價", unitLabel: "" },
];

export const COACH_PRICING_MODES = SERVICE_PRICING_MODES;

export function normalizeServicePricingMode(
  mode: string | null | undefined
): ServicePricingMode {
  if (mode === "session" || mode === "dm") return mode;
  return "hourly";
}

export const normalizeCoachPricingMode = normalizeServicePricingMode;

function getServicePriceAmount(service: {
  hourly_rate?: number | null;
  session_rate?: number | null;
}) {
  return Number(service.hourly_rate ?? service.session_rate) || 0;
}

export function formatServicePrice(
  service: {
    pricing_mode?: string | null;
    hourly_rate?: number | null;
    session_rate?: number | null;
  },
  options?: { defaultMode?: ServicePricingMode }
): { main: string; unit: string | null; isDm: boolean } {
  const defaultMode = options?.defaultMode ?? "hourly";
  const mode = service.pricing_mode
    ? normalizeServicePricingMode(service.pricing_mode)
    : defaultMode;

  if (mode === "dm") {
    return { main: "私訊詢價", unit: null, isDm: true };
  }

  const rate = getServicePriceAmount(service);
  if (rate <= 0) {
    return { main: "價格面議", unit: null, isDm: false };
  }

  return {
    main: `HK$ ${rate}`,
    unit: mode === "session" ? "/ 節" : "/ 小時",
    isDm: false,
  };
}

export function formatCoachServicePrice(service: {
  pricing_mode?: string | null;
  hourly_rate?: number | null;
}) {
  return formatServicePrice(service, { defaultMode: "hourly" });
}

export function formatPhysioServicePrice(service: {
  pricing_mode?: string | null;
  session_rate?: number | null;
}) {
  return formatServicePrice(service, { defaultMode: "session" });
}

export function servicePricingModeLabel(mode: string | null | undefined): string {
  return (
    SERVICE_PRICING_MODES.find((m) => m.id === normalizeServicePricingMode(mode))?.label ??
    "按小時"
  );
}

export const coachPricingModeLabel = servicePricingModeLabel;

export function physioPricingModeLabel(mode: string | null | undefined): string {
  if (mode === "hourly" || mode === "session" || mode === "dm") {
    return SERVICE_PRICING_MODES.find((m) => m.id === mode)!.label;
  }
  return "按節";
}
