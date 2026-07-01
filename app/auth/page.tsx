"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  // Email sign up / sign in
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to verify your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        router.push("/profile");
        router.refresh(); 
      }
    }

    setIsLoading(false);
  };

  // Google OAuth login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 💡 刪除 ?next=/profile，讓它與 Supabase 後台 100% 完全吻合
        redirectTo: `${window.location.origin}/auth/callback`, 
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSignUp
              ? "Join the Pro Sports Network"
              : "Sign in to your account"}
          </p>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
              Email
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
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full p-3 bg-pro-slate-800 border border-pro-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition placeholder:text-slate-600 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 disabled:bg-pro-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Processing..."
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-pro-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-pro-slate-900 px-3 text-slate-500 font-semibold tracking-widest">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-pro-slate-800 hover:bg-pro-slate-700 border border-pro-slate-700 rounded-lg text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        {/* Toggle Sign Up / Sign In */}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          disabled={isLoading}
          className="mt-6 w-full text-center text-sm text-slate-400 hover:text-white underline transition disabled:opacity-50"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}