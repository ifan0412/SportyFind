import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase storage file row from highlights bucket list() */
export type HighlightStorageFile = {
  name: string;
  id: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Gallery uploads use highlight-{timestamp}.{ext} at {userId}/ root only */
const HIGHLIGHT_NAME_RE = /^highlight-\d+\.[a-z0-9]+$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

/**
 * True only for real image files in the user's highlight gallery root.
 * Excludes folders (e.g. services/), placeholders, and non-images.
 */
export function isUserHighlightGalleryFile(file: HighlightStorageFile): boolean {
  if (!file?.name || file.name === ".emptyFolderPlaceholder") return false;
  if (!file.id) return false;
  if (!file.name.includes(".")) return false;

  const mimetype = file.metadata?.mimetype as string | undefined;
  if (mimetype && !mimetype.startsWith("image/")) return false;

  const size = file.metadata?.size;
  if (typeof size === "number" && size <= 0) return false;

  if (HIGHLIGHT_NAME_RE.test(file.name)) return true;
  return IMAGE_EXT_RE.test(file.name);
}

export function highlightGalleryPublicUrl(
  supabase: SupabaseClient,
  userId: string,
  fileName: string
): string {
  return supabase.storage.from("highlights").getPublicUrl(`${userId}/${fileName}`).data.publicUrl;
}

export function mapHighlightGalleryFiles(
  supabase: SupabaseClient,
  userId: string,
  files: HighlightStorageFile[],
  sportName = "Highlight"
) {
  return files
    .filter(isUserHighlightGalleryFile)
    .map((file) => ({
      id: file.id || file.name,
      sportName,
      type: "image" as const,
      url: highlightGalleryPublicUrl(supabase, userId, file.name),
      fileName: file.name,
      createdAt: file.created_at
        ? new Date(file.created_at).toLocaleDateString()
        : "最近上傳",
    }));
}
