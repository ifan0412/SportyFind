import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import {
  formatEventShareDescription,
  getSiteOrigin,
} from "@/lib/event-datetime";
import { fetchEventForShareMetadata } from "@/lib/supabase/public";
import EventDetailClient from "./EventDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const origin = getSiteOrigin();
  const data = await fetchEventForShareMetadata(id);

  if (!data) {
    return {
      title: `賽事／活動 | ${SITE.name}`,
      description: `${SITE.name} — 一站式運動約戰與社群網絡`,
      openGraph: {
        title: SITE.name,
        description: `${SITE.name} — 一站式運動約戰與社群網絡`,
        url: `${origin}/events/${id}`,
        siteName: SITE.name,
        type: "website",
        locale: "zh_HK",
        images: [{ url: `${origin}/icon-512.png`, alt: SITE.name }],
      },
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
