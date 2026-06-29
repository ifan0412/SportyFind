"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const highlights = [
  {
    href: "/events",
    title: "Events",
    description: "Find matches, tournaments, and local competitions.",
    icon: CalendarDays,
  },
  {
    href: "/people",
    title: "People",
    description: "Meet athletes and partners who match your goals.",
    icon: Users,
  },
  {
    href: "/coaches",
    title: "Coaches",
    description: "Work with professional coaches in your discipline.",
    icon: Trophy,
  },
] as const;

export default function Home() {
  useEffect(() => {
    async function verifySupabaseConnection() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase connection failed:", error.message);
          return;
        }

        console.log("Supabase connection successful!");
      } catch (error) {
        console.error(
          "Supabase connection failed:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    void verifySupabaseConnection();
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Pro Sports Network
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Your professional sports community
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Discover events, connect with athletes, and find coaches — all in
            one place built for serious competitors.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            >
              Browse Events
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Profile
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
          {highlights.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
