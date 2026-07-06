import { Suspense } from "react";
import ContentListingClient from "./ContentListingClient";

export const metadata = {
  title: "Sports Tips | SportyFind",
  description: "Training guides, nutrition advice, recovery tips, and sport-specific know-how from SportyFind.",
};

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500">載入中...</div>}>
      <ContentListingClient />
    </Suspense>
  );
}
