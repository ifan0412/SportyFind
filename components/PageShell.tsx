type PageShellProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-base leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {children ? (
          <div className="mt-10">{children}</div>
        ) : (
          <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Content coming soon. This section is ready for your features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
