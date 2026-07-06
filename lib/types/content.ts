export interface ContentLink {
  label: string;
  url: string;
}

export interface ContentPost {
  id: string;
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
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
