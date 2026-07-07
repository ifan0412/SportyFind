export type ServicePhotoEntry = {
  url: string;
  status: "draft" | "published";
};

export function normalizeServicePhotos(
  published: string[] | null | undefined,
  draft: string[] | null | undefined
): ServicePhotoEntry[] {
  const pub = (published || []).map((url) => ({ url, status: "published" as const }));
  const drf = (draft || []).map((url) => ({ url, status: "draft" as const }));
  return [...pub, ...drf];
}

export function publishedPhotoUrls(
  published: string[] | null | undefined,
  draft?: string[] | null | undefined
): string[] {
  void draft;
  return published || [];
}

export function splitPhotoArrays(entries: ServicePhotoEntry[]): {
  photos: string[];
  draft_photos: string[];
} {
  const photos: string[] = [];
  const draft_photos: string[] = [];
  for (const e of entries) {
    if (e.status === "published") photos.push(e.url);
    else draft_photos.push(e.url);
  }
  return { photos, draft_photos };
}
