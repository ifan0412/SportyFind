"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 新增：全局載入狀態
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        setIsLoading(false);
      } else {
        alert("註冊成功！請檢查您的真實郵箱並點擊驗證連結。");
        setIsLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
        setIsLoading(false);
      } else {
        router.push("/profile"); // 登入成功直接帶去個人檔案頁
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // 登入成功後跳轉回首頁
      },
    });
    if (error) {
      alert(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-pro-slate-900 border border-pro-slate-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-black text-white mb-6">
          {isSignUp ? "建立帳號 Create Account" : "歡迎回來 Welcome Back"}
        </h1>
        
        {/* Email 登入表單 */}
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="您的真實 Email (例如: name@gmail.com)" 
            className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            onChange={(e) => setEmail(e.target.value)} 
            disabled={isLoading}
          />
          <input 
            type="password" 
            placeholder="請輸入密碼 Password" 
            className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            onChange={(e) => setPassword(e.target.value)} 
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-pro-blue-600 text-white font-bold rounded-lg hover:bg-pro-blue-500 transition shadow-lg shadow-blue-900/20 disabled:bg-pro-slate-700 disabled:text-slate-400"
          >
            {isLoading ? "處理中..." : (isSignUp ? "立即註冊 Sign Up" : "登入 Login")}
          </button>
        </form>

        {/* 分隔線 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-pro-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-pro-slate-900 px-2 text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* Google 登入按鈕 */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-pro-slate-800 hover:bg-pro-slate-700 border border-pro-slate-700 rounded-lg text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? "正在跳轉至 Google..." : "Google 快速登入 / 註冊"}
        </button>

        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          className="mt-6 w-full text-center text-sm text-slate-400 hover:text-white underline transition"
        >
          {isSignUp ? "已有帳號？直接登入" : "還沒帳號？切換到立即註冊"}
        </button>
      </div>
    </div>
  );
}