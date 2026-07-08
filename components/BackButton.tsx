"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const className =
  "group flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white transition duration-300 mb-1 md:mb-3";

export function BackButton({ label = "返回上一頁", href }: { label?: string; href?: string }) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} className={className}>
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-300" />
        {label}
      </Link>
    );
  }

  return (
    <button onClick={() => router.back()} className={className}>
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-300" />
      {label}
    </button>
  );
}