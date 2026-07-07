"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SportCategory, RecruitmentStatus } from "@/types/team";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import { ImageCropModal } from "@/components/media/ImageCropModal";
import { readFileAsDataUrl } from "@/lib/image-crop";

type SportMetadata = Record<string, string | boolean | string[] | unknown>;

interface FormData {
  sport_category: SportCategory | "";
  name_en: string;
  name_zh: string;
  est_year: string;
  recruitment_status: RecruitmentStatus;
  sport_metadata: Record<string, string | boolean | string[]>;
  bio: string;
  contact_phone: string;
  contact_email: string;
  social_ig: string;
  social_fb: string;
}

const DEFAULT_FORM: FormData = {
  sport_category: "",
  name_en: "",
  name_zh: "",
  est_year: "",
  recruitment_status: "open",
  sport_metadata: {},
  bio: "",
  contact_phone: "",
  contact_email: "",
  social_ig: "",
  social_fb: "",
};

const SPORT_OPTIONS = SPORT_CATEGORIES;

import { getTeamMetaFields, cleanTeamMetadata, regionsToLocationString } from "@/lib/team-metadata-fields";

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["基礎資訊", "專項詳情", "介紹與送出"];
  return (
    <div className="flex items-center gap-0 w-full mb-10">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1.5 ${active ? "scale-110" : ""} transition-transform`}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all
                  ${done   ? "bg-amber-500 border-amber-500 text-black"         : ""}
                  ${active ? "bg-slate-50  border-slate-50  text-black shadow-[0_0_16px_rgba(255,255,255,0.2)]" : ""}
                  ${!done && !active ? "bg-slate-900 border-slate-700 text-zinc-500" : ""}
                `}
              >
                {done ? "✓" : step}
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap ${active ? "text-white" : done ? "text-amber-400" : "text-zinc-600"}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-14px] transition-colors ${done ? "bg-amber-500/60" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition";
const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 pl-1";

export default function CreateTeamPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"logo" | "cover" | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setMeta = (key: string, value: string | boolean | string[]) =>
    setFormData((prev) => ({
      ...prev,
      sport_metadata: { ...prev.sport_metadata, [key]: value },
    }));

  const toggleRegion = (key: string, region: string) => {
    const current = (formData.sport_metadata[key] as string[] | undefined) ?? [];
    const next = current.includes(region)
      ? current.filter((r) => r !== region)
      : [...current, region];
    setMeta(key, next);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropImageSrc(await readFileAsDataUrl(file));
    setCropTarget(type);
  };

  const closeCropModal = () => {
    setCropTarget(null);
    setCropImageSrc(null);
  };

  const handleCropConfirm = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    if (cropTarget === "logo") {
      setLogoFile(file);
      setLogoPreview(objectUrl);
    } else if (cropTarget === "cover") {
      setCoverFile(file);
      setCoverPreview(objectUrl);
    }
    closeCropModal();
  };

  const metaFields = getTeamMetaFields(formData.sport_category);
  const canProceed = currentStep === 1 ? formData.sport_category !== "" && formData.name_en.trim() !== "" : true;

  const handleSubmit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("請先登入才能建立團隊。"); setIsSaving(false); return; }

      let finalLogoUrl: string | null = null;
      let finalCoverUrl: string | null = null;

      // 1. 若有上傳 Logo，送至 Supabase Storage bucket: "team-assets"
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `logos/${user.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("team-assets")
          .upload(path, logoFile, { upsert: true });

        if (uploadErr) {
          setError(`Logo 上傳失敗: ${uploadErr.message}`);
          setIsSaving(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("team-assets").getPublicUrl(path);
        finalLogoUrl = publicUrl;
      }

      // 2. 若有上傳封面圖，送至 Supabase Storage
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `covers/${user.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("team-assets")
          .upload(path, coverFile, { upsert: true });

        if (uploadErr) {
          setError(`封面圖上傳失敗: ${uploadErr.message}`);
          setIsSaving(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("team-assets").getPublicUrl(path);
        finalCoverUrl = publicUrl;
      }

      const cleanedMeta = cleanTeamMetadata(formData.sport_metadata);
      const regionData = cleanedMeta.location_regions as string[] | undefined;

      const payload = {
        name_en:            formData.name_en.trim(),
        name_zh:            formData.name_zh.trim() || null,
        sport_category:     formData.sport_category as SportCategory,
        recruitment_status: formData.recruitment_status,
        est_year:           formData.est_year ? Number(formData.est_year) : null,
        bio:                formData.bio.trim() || null,
        logo_url:           finalLogoUrl,
        cover_url:          finalCoverUrl,
        location_region:    regionsToLocationString(regionData ?? []),
        social_links: {
          phone:   formData.contact_phone.trim() || undefined,
          email:   formData.contact_email.trim() || undefined,
          ig:      formData.social_ig.trim()      || undefined,
          fb:      formData.social_fb.trim()      || undefined,
        },
        sport_metadata: cleanedMeta as SportMetadata,
        created_by: user.id,
      };

      // 🎯 寫入 teams 表格並取得新球隊的 ID
      const { data: newTeam, error: dbError } = await supabase
        .from("teams")
        .insert(payload)
        .select("id")
        .single();

      if (dbError) { setError(dbError.message); return; }

      // 🚀 注意看！這裡原本寫入 team_members 的程式碼已經直接移除了！
      // 因為後端 SQL Trigger 已經瞬間幫你加入了 admin 權限

      // 直接順暢跳轉進專屬管理後台！
      router.push(`/team/${newTeam.id}/admin`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-amber-500/30 pb-24">
      <div className="w-full max-w-4xl md:max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <button
          onClick={() => (currentStep > 1 ? setCurrentStep((s) => s - 1) : router.push("/team"))}
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm font-bold mb-8 transition"
        >
          ← {currentStep > 1 ? "上一步" : "返回列表"}
        </button>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">建立球隊 / 小組</h1>
        <p className="text-zinc-500 text-sm mb-8">填寫基本資料，讓志同道合的運動員找到你們。</p>

        <StepIndicator current={currentStep} total={3} />

        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className={labelCls}>運動種類 *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPORT_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { set("sport_category", s.id as SportCategory); set("sport_metadata", {}); }}
                    className={`flex flex-col items-center gap-1 py-4 rounded-2xl border text-center transition-all min-h-[88px]
                      ${formData.sport_category === s.id
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(217,119,6,0.2)]"
                        : "bg-slate-900/50 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                      }`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-sm font-black text-white leading-tight">{s.labelZh}</span>
                    <span className="text-[9px] font-black tracking-widest text-zinc-500">{s.labelZh}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>英文隊名 * <span className="text-amber-500/70 normal-case font-normal">(必填，對外顯示)</span></label>
              <input className={inputCls} placeholder="例如：Kowloon Dunkers" value={formData.name_en} onChange={(e) => set("name_en", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>中文隊名 <span className="normal-case font-normal text-zinc-600">(選填)</span></label>
              <input className={inputCls} placeholder="例如：九龍飛躍隊" value={formData.name_zh} onChange={(e) => set("name_zh", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>成立年份 <span className="normal-case font-normal text-zinc-600">(選填)</span></label>
                <input type="number" className={inputCls} placeholder="例如：2022" min={1900} max={new Date().getFullYear()} value={formData.est_year} onChange={(e) => set("est_year", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>招募狀態 *</label>
                <select className={inputCls} value={formData.recruitment_status} onChange={(e) => set("recruitment_status", e.target.value as RecruitmentStatus)}>
                  <option value="open">🟢 公開招募</option>
                  <option value="invite_only">🔵 邀請制</option>
                  <option value="closed">🔴 暫停招募</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 mb-2 flex items-center gap-3">
              <span className="text-2xl">{SPORT_OPTIONS.find(s => s.id === formData.sport_category)?.emoji}</span>
              <div>
                <p className="text-sm font-black text-white">{SPORT_OPTIONS.find(s => s.id === formData.sport_category)?.labelZh}</p>
                <p className="text-[10px] text-zinc-500">以下欄位依據你的運動種類自動產生，全部為選填。</p>
              </div>
            </div>
            {metaFields.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">此運動種類暫無專項欄位，請直接進入下一步。</p>
            )}
            {metaFields.map((field) => (
              <div key={field.key}>
                <label className={labelCls}>{field.label}</label>
                {field.type === "text" && (
                  <input className={inputCls} placeholder={field.placeholder} value={(formData.sport_metadata[field.key] as string) ?? ""} onChange={(e) => setMeta(field.key, e.target.value)} />
                )}
                {field.type === "select" && (
                  <select className={inputCls} value={(formData.sport_metadata[field.key] as string) ?? ""} onChange={(e) => setMeta(field.key, e.target.value)}>
                    <option value="">-- 請選擇 --</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                {field.type === "boolean" && (
                  <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                    <input type="checkbox" checked={(formData.sport_metadata[field.key] as boolean) ?? false} onChange={(e) => setMeta(field.key, e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-950" />
                    <span className="text-sm text-slate-300 font-bold">是</span>
                  </label>
                )}
                {field.type === "multiselect" && (
                  <div className="grid grid-cols-2 gap-2">
                    {field.options?.map((opt) => {
                      const selected = ((formData.sport_metadata[field.key] as string[] | undefined) ?? []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleRegion(field.key, opt.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all text-left
                            ${selected ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]" : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider pl-1">🖼️ 團隊視覺檔案上傳 <span className="normal-case font-normal text-zinc-600">(支援 PNG/JPG，皆為選填)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className={labelCls}>團隊 Logo 徽章檔案</label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/60 rounded-2xl p-4 cursor-pointer transition group">
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} className="hidden" />
                    {logoPreview ? (
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-12 h-12 rounded-xl bg-cover bg-center border border-slate-700 shrink-0" style={{ backgroundImage: `url(${logoPreview})` }} />
                        <div className="truncate text-left">
                          <p className="text-xs font-bold text-white truncate">{logoFile?.name}</p>
                          <span className="text-[10px] text-amber-400 group-hover:underline">點擊更換檔案</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-xl">📁</span>
                        <p className="text-xs font-bold text-zinc-400 mt-1">選擇或拖曳 Logo 圖片</p>
                        <span className="text-[10px] text-zinc-600">最佳比例 1:1 正方形</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>專屬主頁封面大圖檔案</label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/60 rounded-2xl p-4 cursor-pointer transition group">
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "cover")} className="hidden" />
                    {coverPreview ? (
                      <div className="w-full space-y-1.5">
                        <div className="w-full h-12 rounded-lg bg-cover bg-center border border-slate-700" style={{ backgroundImage: `url(${coverPreview})` }} />
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-300 font-bold truncate max-w-[160px]">{coverFile?.name}</span>
                          <span className="text-amber-400 group-hover:underline">點擊更換</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-xl">🏞️</span>
                        <p className="text-xs font-bold text-zinc-400 mt-1">選擇或拖曳橫幅大圖</p>
                        <span className="text-[10px] text-zinc-600">上傳後可裁切並預覽手機／桌面效果</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>團隊簡介 Bio <span className="normal-case font-normal text-zinc-600">(選填)</span></label>
              <textarea className={`${inputCls} resize-none h-28`} placeholder="介紹你們的隊伍風格、目標、招募期望..." value={formData.bio} onChange={(e) => set("bio", e.target.value)} />
            </div>

            {/* ✅ 聯絡方式填寫區 */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider pl-1">📞 聯絡與社群資訊 <span className="normal-case font-normal text-zinc-600">(對外展示，皆為選填)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>聯絡電話／WhatsApp</label>
                  <input className={inputCls} placeholder="例如：+852 9123 4567" value={formData.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>公開聯絡 Email</label>
                  <input type="email" className={inputCls} placeholder="team@example.com" value={formData.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Instagram 帳號網址</label>
                  <input className={inputCls} placeholder="https://instagram.com/yourteam" value={formData.social_ig} onChange={(e) => set("social_ig", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Facebook 專頁網址</label>
                  <input className={inputCls} placeholder="https://facebook.com/yourteam" value={formData.social_fb} onChange={(e) => set("social_fb", e.target.value)} />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl p-4">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-10">
          {currentStep > 1 && (
            <button onClick={() => setCurrentStep((s) => s - 1)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">
              上一步
            </button>
          )}

          {currentStep < 3 ? (
            <button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.2)] active:scale-[.98]">
              {currentStep === 1 && !canProceed ? "請選擇運動種類並填寫隊名" : "下一步 →"}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] active:scale-[.98]">
              {isSaving ? "處理中並建立後台..." : "🚀 建立團隊"}
            </button>
          )}
        </div>

      </div>

      <ImageCropModal
        open={cropTarget !== null}
        imageSrc={cropImageSrc}
        preset={cropTarget === "logo" ? "logo" : "team-cover"}
        filename={cropTarget === "logo" ? "team-logo.jpg" : "team-cover.jpg"}
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}