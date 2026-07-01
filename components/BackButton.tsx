"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react"; // 記得我們有安裝 lucide-react

export function BackButton({ label = "返回上一頁" }: { label?: string }) {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className="group flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white transition duration-300 mb-6"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-300" /> 
      {label}
    </button>
  );
}