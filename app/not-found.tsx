import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
      <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl">
        🚧
      </div>
      <h1 className="text-4xl font-black text-white tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-bold text-zinc-400 mb-8">此頁面尚未建立或已遺失</h2>
      <Link 
        href="/" 
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full transition shadow-[0_0_15px_rgba(37,99,235,0.4)]"
      >
        返回主場
      </Link>
    </div>
  );
}