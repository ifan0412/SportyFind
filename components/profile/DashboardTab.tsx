"use client";

import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface DashboardTabProps {
  editForm: any;
  isSaving: boolean;
  onFieldChange: (key: string, value: any) => void;
  onSave: () => void;
}

export function DashboardTab({ editForm, isSaving, onFieldChange, onSave }: DashboardTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
          <span>👤</span> 運動員 Bio
        </h3>
        <RichTextEditor
          value={editForm.athlete_bio || ""}
          onChange={(html) => onFieldChange("athlete_bio", html)}
          placeholder="介紹你的運動背景、專項風格與目標..."
          variant="compact"
          minHeight="180px"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
          <span>📬</span> 運動員聯絡資訊
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1 block">Email</label>
            <input
              type="email"
              value={editForm.contact_email || ""}
              onChange={(e) => onFieldChange("contact_email", e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 transition outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1 block">電話</label>
            <input
              value={editForm.contact_phone || ""}
              onChange={(e) => onFieldChange("contact_phone", e.target.value)}
              placeholder="+852 9123 4567"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 transition outline-none"
            />
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={!!editForm.player_phone_friends_only}
                onChange={(e) => onFieldChange("player_phone_friends_only", e.target.checked)}
                className="rounded bg-slate-900 border-slate-700"
              />
              <span className="text-xs text-zinc-300">僅好友可見</span>
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1 block">WhatsApp</label>
          <input
            value={editForm.player_whatsapp || ""}
            onChange={(e) => onFieldChange("player_whatsapp", e.target.value)}
            placeholder="+852 9123 4567"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 transition outline-none"
          />
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={!!editForm.player_whatsapp_friends_only}
              onChange={(e) => onFieldChange("player_whatsapp_friends_only", e.target.checked)}
              className="rounded bg-slate-900 border-slate-700"
            />
            <span className="text-xs text-zinc-300">僅好友可見</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl transition disabled:opacity-60"
        >
          {isSaving ? "儲存中..." : "儲存運動員後台設定"}
        </button>
      </div>
    </div>
  );
}