import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function SportsTipsHomeBlock() {
  return (
    <Link
      href="/content"
      className="group relative w-full flex flex-col md:flex-row items-center justify-between p-6 md:px-8 md:py-7 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-slate-900/80 backdrop-blur-md border border-violet-500/30 hover:border-violet-400/60 rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10 overflow-hidden"
    >
      <div className="absolute top-0 left-0 -ml-16 -mt-16 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 text-center md:text-left z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
          <Sparkles className="w-7 h-7" strokeWidth={2.5} />
        </div>
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              運動貼士
            </h3>
            <span className="px-2 py-0.5 text-[9px] font-black bg-fuchsia-500 text-slate-950 rounded-md uppercase tracking-wider">
              新上線
            </span>
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-300">
            訓練、營養與復康指南
          </p>
        </div>
      </div>

      <div className="mt-4 md:mt-0 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors z-10">
        <span>閱讀貼士</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
