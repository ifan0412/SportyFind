import type { LucideIcon } from "lucide-react";
import type { ListingSectionId } from "@/lib/listing-sections";
import { LISTING_SECTIONS } from "@/lib/listing-sections";

interface ListingPageHeaderProps {
  section: ListingSectionId;
  /** Override default title from section config */
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ListingPageHeader({
  section,
  title,
  subtitle,
  className = "",
}: ListingPageHeaderProps) {
  const config = LISTING_SECTIONS[section];
  const Icon = config.icon as LucideIcon;
  const heading = title ?? config.title;
  const desc = subtitle ?? config.subtitle;

  return (
    <header className={`mb-6 md:mb-8 text-center md:text-left mt-2 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
        <div
          className={`mx-auto md:mx-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${config.gradient} ${config.shadow} shrink-0`}
        >
          <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{heading}</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {config.subtitleEn}
          </p>
        </div>
      </div>
      <p className="text-zinc-400 text-sm md:text-base font-medium max-w-2xl mx-auto md:mx-0 leading-relaxed">
        {desc}
      </p>
    </header>
  );
}
