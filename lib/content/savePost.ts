import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentLink } from "@/lib/types/content";

export interface ContentSaveInput {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  categories: string[];
  sports: string[];
  status: "draft" | "published";
  links: ContentLink[];
  meta_title: string | null;
  meta_description: string | null;
  author_id: string;
  published_at: string | null;
}

export function getSupabaseErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "儲存失敗";
}

/** DB has not run migration 008 — still uses category / sport columns */
function isMissingMultiSelectColumns(err: unknown): boolean {
  const msg = getSupabaseErrorMessage(err).toLowerCase();
  return (
    msg.includes("could not find the 'categories' column") ||
    msg.includes("could not find the 'sports' column") ||
    msg.includes("column content_posts.categories") ||
    msg.includes("schema cache")
  );
}

function buildNewSchemaPayload(input: ContentSaveInput) {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    cover_image_url: input.cover_image_url,
    categories: input.categories,
    sports: input.sports,
    status: input.status,
    links: input.links,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    author_id: input.author_id,
    published_at: input.published_at,
  };
}

function buildLegacySchemaPayload(input: ContentSaveInput) {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    cover_image_url: input.cover_image_url,
    category: input.categories[0] || "general",
    sport: input.sports[0] || null,
    status: input.status,
    links: input.links,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    author_id: input.author_id,
    published_at: input.published_at,
  };
}

export async function saveContentPost(
  supabase: SupabaseClient,
  input: ContentSaveInput,
  postId?: string
): Promise<{ error: string | null; usedLegacySchema?: boolean }> {
  const newPayload = buildNewSchemaPayload(input);
  const legacyPayload = buildLegacySchemaPayload(input);

  if (postId) {
    const { error } = await supabase.from("content_posts").update(newPayload).eq("id", postId);
    if (!error) return { error: null };
    if (isMissingMultiSelectColumns(error)) {
      const { error: legacyError } = await supabase
        .from("content_posts")
        .update(legacyPayload)
        .eq("id", postId);
      if (legacyError) return { error: getSupabaseErrorMessage(legacyError) };
      return {
        error: null,
        usedLegacySchema: true,
      };
    }
    return { error: getSupabaseErrorMessage(error) };
  }

  const { error } = await supabase.from("content_posts").insert(newPayload);
  if (!error) return { error: null };
  if (isMissingMultiSelectColumns(error)) {
    const { error: legacyError } = await supabase.from("content_posts").insert(legacyPayload);
    if (legacyError) return { error: getSupabaseErrorMessage(legacyError) };
    return {
      error: null,
      usedLegacySchema: true,
    };
  }
  return { error: getSupabaseErrorMessage(error) };
}
