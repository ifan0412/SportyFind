"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { type ProfileGender, PROFILE_GENDER_OPTIONS } from "@/lib/gender";

interface RoleOptionProps {
  checked: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  accentClass: string;
}

function RoleOption({
  checked,
  onToggle,
  title,
  description,
  accentClass,
}: RoleOptionProps) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
        checked
          ? `${accentClass} bg-slate-900/90 shadow-md`
          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
      }`}
    >
      <div
        className={`w-5 h-5 rounded flex items-center justify-center border mt-0.5 shrink-0 transition-colors ${
          checked
            ? "bg-blue-600 border-blue-500 text-white"
            : "border-slate-700 bg-slate-900"
        }`}
      >
        {checked && (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <h4 className="font-bold text-white text-sm tracking-wide">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function RoleOnboardingContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "/profile";

  const [isPlayer, setIsPlayer] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isPhysio, setIsPhysio] = useState(false);
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!isPlayer && !isCoach && !isPhysio) {
      toast.error("請至少選擇一個身分");
      return;
    }
    if (!gender) {
      toast.error("請選擇性別");
      return;
    }

    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        gender,
        roles_confirmed: true,
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      toast.error("儲存失敗，請稍後再試");
      console.error("Save role error:", error);
      return;
    }

    toast.success("身分設定完成！");
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl animate-fadeIn">
        <div className="mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            新手設定
          </span>
          <h1 className="text-2xl font-black text-white mt-3">選擇你在平台上的身分</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            這將決定系統為你預設展示的功能與頁籤，可複選多個身分。
          </p>
        </div>

        <div className="space-y-3">
          <RoleOption
            checked={isPlayer}
            onToggle={() => setIsPlayer((v) => !v)}
            title="運動員 / 球員"
            description="展示技術特長、賽場圖庫等球員專屬檔案內容。"
            accentClass="border-blue-500/80"
          />
          <RoleOption
            checked={isCoach}
            onToggle={() => setIsCoach((v) => !v)}
            title="教練"
            description="開放教學服務、課程預約與教練專區。"
            accentClass="border-amber-500/80"
          />
          <RoleOption
            checked={isPhysio}
            onToggle={() => setIsPhysio((v) => !v)}
            title="運動/物理治療"
            description="公開診所資訊、專業資歷與預約服務。"
            accentClass="border-emerald-500/80"
          />
        </div>

        <div className="mt-5">
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
            性別 <span className="normal-case font-normal text-zinc-600">(顯示於報名與成員名單)</span>
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as ProfileGender)}
            disabled={isSaving}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
          >
            <option value="">請選擇</option>
            {PROFILE_GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <p className="text-[11px] text-slate-500 mt-5">
          之後仍可隨時在「編輯個人檔案」中新增或取消身分。
        </p>

        <button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full mt-6 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {isSaving ? "儲存設定中..." : "確認並進入平台"}
        </button>
      </div>
    </div>
  );
}

export default function RoleOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">
          載入中...
        </div>
      }
    >
      <RoleOnboardingContent />
    </Suspense>
  );
}