import { Suspense } from "react";
import ContentListingClient from "./ContentListingClient";

export const metadata = {
  title: "運動貼士 | SportyFind",
  description: "訓練、營養、復康與運動實用指南。",
};

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500">載入中...</div>}>
      <ContentListingClient />
    </Suspense>
  );
}
