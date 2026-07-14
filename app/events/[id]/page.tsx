import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import {
  formatEventShareDescription,
  getSiteOrigin,
} from "@/lib/event-datetime";
import EventDetailClient from "./EventDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const origin = getSiteOrigin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, start_time, end_time, location_name, location_address, cover_image_url, status")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return {
      title: `活動未找到 | ${SITE.name}`,
      description: "此賽事／活動不存在或已下架。",
    };
  }

  const title = data.title?.trim() || "賽事／活動";
  const description = formatEventShareDescription({
    startTime: data.start_time,
    endTime: data.end_time,
    locationName: data.location_name,
    locationAddress: data.location_address,
  });
  const url = `${origin}/events/${data.id}`;
  const images = data.cover_image_url
    ? [{ url: data.cover_image_url, alt: title }]
    : [{ url: `${origin}/icon-512.png`, alt: SITE.name }];

  return {
    title: `${title} | ${SITE.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      locale: "zh_HK",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
  };
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}
