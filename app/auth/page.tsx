"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { getPasswordValidationError } from "@/lib/password";
import { type ProfileGender, PROFILE_GENDER_OPTIONS } from "@/lib/gender";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 註冊專用欄位
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState(""); 
  const [handle, setHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // 角色複選狀態（運動員預設打勾）
  const [isPlayer, setIsPlayer] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [isPhysio, setIsPhysio] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [gender, setGender] = useState<ProfileGender | "">("");

  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const isValidHandle = (val: string): boolean => {
    const handleRegex = /^[a-zA-Z0-9][a-zA-Z0-9._]{1,18}[a-zA-Z0-9]$/;
    return handleRegex.test(val);
  };

  useEffect(() => {
    if (!isSignUp || !handle) {
      setHandleStatus("idle");
      return;
    }

    if (handle.length < 3 || !isValidHandle(handle)) {
      setHandleStatus("invalid");
      return;
    }

    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();

      setHandleStatus(data ? "taken" : "available");
    }, 500);

    return () => clearTimeout(timer);
  }, [handle, isSignUp, supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("請輸入電郵與密碼。");
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      if (!isPlayer && !isCoach && !isPhysio) {
        toast.error("請至少選擇一個身分。");
        setIsLoading(false);
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("請輸入名字與姓氏。");
        setIsLoading(false);
        return;
      }
      if (handleStatus !== "available") {
        toast.error("請選擇有效且可用的帳戶 ID。");
        setIsLoading(false);
        return;
      }
      if (!acceptedTerms) {
        toast.error("請同意服務條款與私隱政策。");
        setIsLoading(false);
        return;
      }
      if (!gender) {
        toast.error("請選擇性別。");
        setIsLoading(false);
        return;
      }

      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        toast.error(passwordError);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            handle: handle.trim(),
            is_player: isPlayer,
            is_coach: isCoach,
            is_physio: isPhysio,
            roles_confirmed: true,
            gender,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("帳戶已建立！請查收電郵完成驗證。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("歡迎回來！");
        router.push("/profile");
        router.refresh();
      }
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-pro-slate-900 border border-pro-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">
            {isSignUp ? "建立帳戶" : "歡迎回來"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSignUp ? "加入專業運動社群網絡" : "登入您的帳戶"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-4 animate-fadeIn">
              {/* 🔥 角色選擇放在最上方 */}
              <div className="pb-2 border-b border-pro-slate-800">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  1. 選擇您的身分（至少選一項）
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayer(!isPlayer)}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      isPlayer
                        ? "bg-blue-600/20 border-blue-500 text-white shadow"
                        : "bg-pro-slate-800/60 border-pro-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-lg">👤</span>
                    <span className="text-xs font-bold">運動員</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCoach(!isCoach)}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      isCoach
                        ? "bg-amber-600/20 border-amber-500 text-amber-400 shadow"
                        : "bg-pro-slate-800/60 border-pro-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-lg">🎓</span>
                    <span className="text-xs font-bold">教練</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPhysio(!isPhysio)}
                    className={`p-3 rounded-lg border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      isPhysio
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow"
                        : "bg-pro-slate-800/60 border-pro-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-lg">⚕️</span>
                    <span className="text-xs font-bold">物理治療</span>
                  </button>
                </div>
              </div>

              {/* 🔥 接著才是 First Name / Last Name */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                    名字
                  </label>
                  <input
                    type="text"
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    required={isSignUp}
                    className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition placeholder:text-slate-600 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                    姓氏
                  </label>
                  <input
                    type="text"
                    placeholder="Takahashi"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required={isSignUp}
                    className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition placeholder:text-slate-600 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                  性別 <span className="normal-case font-normal text-zinc-600">(顯示於報名與成員名單)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as ProfileGender)}
                  disabled={isLoading}
                  required={isSignUp}
                  className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition disabled:opacity-50"
                >
                  <option value="">請選擇</option>
                  {PROFILE_GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Account ID (Handle) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    帳戶 ID（Handle）
                  </label>
                  {handle && (
                    <span className="text-xs font-bold">
                      {handleStatus === "checking" && <span className="text-slate-400">檢查中…</span>}
                      {handleStatus === "available" && <span className="text-emerald-400">✓ 可使用</span>}
                      {handleStatus === "taken" && <span className="text-red-400">✕ 已被使用</span>}
                      {handleStatus === "invalid" && <span className="text-red-400">✕ 格式無效</span>}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500 font-mono text-sm">@</span>
                  <input
                    type="text"
                    placeholder="alextennis_99"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    disabled={isLoading}
                    required={isSignUp}
                    className={`w-full p-3 pl-8 bg-pro-slate-800 border rounded-lg text-white font-mono text-sm focus:ring-2 outline-none transition placeholder:text-slate-600 disabled:opacity-50 ${
                      handleStatus === "taken" || handleStatus === "invalid"
                        ? "border-red-500 focus:ring-red-500"
                        : handleStatus === "available"
                        ? "border-emerald-500 focus:ring-emerald-500"
                        : "border-pro-slate-700 focus:ring-blue-500"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  僅限英文字母、數字、點（.）與底線（_），3–20 字元，不可含空格。
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              電郵
            </label>
            <input
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition placeholder:text-slate-600 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              密碼
            </label>
            <input
              type="password"
              placeholder="輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition placeholder:text-slate-600 disabled:opacity-50"
            />
            {isSignUp && (
              <div className="mt-2.5 p-3 rounded-lg bg-pro-slate-800/60 border border-pro-slate-700/80">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">密碼要求</p>
                <PasswordRequirements password={password} />
              </div>
            )}
          </div>

          {isSignUp && (
            <label className="flex items-start gap-3 p-3 rounded-lg bg-pro-slate-800/40 border border-pro-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-600"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                我已閱讀並同意{" "}
                <Link href="/terms" target="_blank" className="text-blue-400 hover:underline font-bold">服務條款</Link>
                、{" "}
                <Link href="/privacy" target="_blank" className="text-blue-400 hover:underline font-bold">私隱政策</Link>
                {" "}及{" "}
                <Link href="/cookies" target="_blank" className="text-blue-400 hover:underline font-bold">Cookie 政策</Link>。
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={isLoading || (isSignUp && (handleStatus !== "available" || !acceptedTerms))}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 disabled:bg-pro-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {isLoading ? "處理中…" : isSignUp ? "建立帳戶" : "登入"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-pro-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-pro-slate-900 px-3 text-slate-500 font-semibold tracking-widest">
              或使用以下方式繼續
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
          className="w-full flex items-center justify-center gap-3 py-3 bg-pro-slate-800 hover:bg-pro-slate-700 border border-pro-slate-700 rounded-lg text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? "正在前往 Google…" : "使用 Google 繼續"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setHandleStatus("idle");
            setAcceptedTerms(false);
            setGender("");
          }}
          disabled={isLoading}
          className="mt-6 w-full text-center text-sm text-slate-400 hover:text-white underline transition disabled:opacity-50"
        >
          {isSignUp ? "已有帳戶？登入" : "還沒有帳戶？註冊"}
        </button>
      </div>
    </div>
  );
}