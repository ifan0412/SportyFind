/** Max characters for coach / physio service inquiry messages */
export const ENQUIRY_MESSAGE_MAX = 100;

export const ENQUIRY_CONTACTED_STATUS = "contacted" as const;

export function clampEnquiryMessage(value: string): string {
  return value.slice(0, ENQUIRY_MESSAGE_MAX);
}

/** True when the enquiry still needs host attention (not manually marked contacted). */
export function isEnquiryUncontacted(status: string | null | undefined): boolean {
  return String(status || "").toLowerCase() !== ENQUIRY_CONTACTED_STATUS;
}

export function enquiryServiceIdsWithUncontacted(
  rows: Array<{ service_id: string; status?: string | null }> | null | undefined
): string[] {
  if (!rows?.length) return [];
  return [
    ...new Set(
      rows.filter((r) => isEnquiryUncontacted(r.status)).map((r) => r.service_id)
    ),
  ];
}

export function serviceHasUncontactedEnquiry(
  serviceId: string,
  uncontactedServiceIds: Iterable<string>
): boolean {
  return new Set(uncontactedServiceIds).has(serviceId);
}
