export const MAX_LISTING_SERVICES = 2;

export type ListingSelectableService = {
  id: string;
  show_on_listing?: boolean | null;
};

export function countListingSelections(services: ListingSelectableService[]): number {
  return services.filter((s) => s.show_on_listing).length;
}

export function canEnableListingSelection(
  services: ListingSelectableService[],
  serviceId: string
): boolean {
  const target = services.find((s) => s.id === serviceId);
  if (!target) return false;
  if (target.show_on_listing) return true;
  return countListingSelections(services) < MAX_LISTING_SERVICES;
}

export function listingSelectionLabel(selected: number): string {
  return `名錄展示 (${selected}/${MAX_LISTING_SERVICES})`;
}

export function shouldAutoSelectListingOnPublish(
  services: ListingSelectableService[],
  serviceId: string
): boolean {
  const others = services.filter((s) => s.id !== serviceId);
  return countListingSelections(others) < MAX_LISTING_SERVICES;
}
