import { Suspense } from "react";
import ContentListingClient from "./ContentListingClient";

export const metadata = {
  title: "運動知識庫 | SportyFind",
  description: "訓練技巧、平台指南、各項運動入門與社群攻略 — SportyFind 運動知識庫。",
};

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500">載入中...</div>}>
      <ContentListingClient />
    </Suspense>
  );
}
