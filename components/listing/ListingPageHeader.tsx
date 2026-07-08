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
    <header className={`mb-4 md:mb-8 text-left mt-0 ${className}`}>
      <div className="flex flex-row items-center gap-3 sm:gap-4 mb-3">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${config.gradient} ${config.shadow} shrink-0`}
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">{heading}</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {config.tagline}
          </p>
        </div>
      </div>
      <p className="text-zinc-400 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
        {desc}
      </p>
    </header>
  );
}
