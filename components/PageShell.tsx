type PageShellProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
};

export function PageShell({ title, subtitle, badge, children }: PageShellProps) {
  return (
    <div className="flex flex-1 flex-col bg-slate-950 min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mx-auto max-w-2xl text-center mb-10">
          {badge && (
            <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-900 border border-slate-700 text-blue-400 rounded-full mb-4">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base leading-7 text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Page content */}
        {children ?? (
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
            <p className="text-sm text-slate-500">
              This section is coming soon. Check back later.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}