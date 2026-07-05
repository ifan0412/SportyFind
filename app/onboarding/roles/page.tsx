"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function RoleOnboardingContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "/profile";

  const [isPlayer, setIsPlayer] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isPhysio, setIsPhysio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!isPlayer && !isCoach && !isPhysio) {
      toast.error("請至少選擇一個身分");
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("登入狀態已過期，請重新登入");
      setIsSaving(false);
      router.push("/auth");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_player: isPlayer,
        is_coach: isCoach,
        is_physio: isPhysio,
        roles_confirmed: true,
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      toast.error("儲存失敗：" + error.message);
      return;
    }

    toast.success("身分設定完成！");
    router.push(next);
    router.refresh();
  };

  const RoleOption = ({
    checked,
    onToggle,
    emoji,
    title,
    description,
    accentClass,
  }: {
    checked: boolean;
    onToggle: () => void;
    emoji: string;
    title: string;
    description: string;
    accentClass: string;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
        checked
          ? `${accentClass} shadow-lg`
          : "bg-pro-slate-800/50 border-pro-slate-700 hover:border-pro-slate-600"
      }`}
    >
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black text-white text-sm">{title}</span>
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
              checked ? "bg-blue-500 border-blue-500" : "border-slate-600"
            }`}
          >
            {checked && <span className="text-white text-xs font-black">✓</span>}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-pro-slate-900 border border-pro-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">歡迎加入！</h1>
          <p className="text-slate-400 text-sm mt-1">
            在開始之前，請告訴我們你的身分（可複選），這將決定你的個人檔案會顯示哪些內容。
          </p>
        </div>

        <div className="space-y-3">
          <RoleOption
            checked={isPlayer}
            onToggle={() => setIsPlayer((v) => !v)}
            title="運動員 / 球員"
            description="展示技術特長、賽場圖庫等球員專屬檔案內容。"
            accentClass="bg-blue-600/20 border-blue-500"
          />
          <RoleOption
            checked={isCoach}
            onToggle={() => setIsCoach((v) => !v)}
            title="教練"
            description="開放教學服務、課程預約與教練專區。"
            accentClass="bg-amber-600/20 border-amber-500"
          />
          <RoleOption
            checked={isPhysio}
            onToggle={() => setIsPhysio((v) => !v)}
            title="運動/物理治療"
            description="公開診所資訊、專業資歷與預約服務。"
            accentClass="bg-emerald-600/20 border-emerald-500"
          />
        </div>

        <p className="text-[10px] text-slate-500 mt-4">
          之後仍可隨時在「編輯個人檔案」中新增或取消身分。
        </p>

        <button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 disabled:bg-pro-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {isSaving ? "儲存中..." : "繼續"}
        </button>
      </div>
    </div>
  );
}

export default function RoleOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-pro-slate-950 flex items-center justify-center text-slate-500 font-mono">載入中...</div>}>
      <RoleOnboardingContent />
    </Suspense>
  );
}