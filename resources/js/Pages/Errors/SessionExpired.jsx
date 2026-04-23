import { Head, Link } from "@inertiajs/react";

export default function SessionExpired() {
  return (
    <>
      <Head title="419 - Session Expired" />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <p className="text-amber-400 text-sm tracking-[0.25em] uppercase mb-3">Error 419</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Session expired</h1>
          <p className="text-slate-300 mb-8">
            Your session token is no longer valid. Refresh or sign in again to continue.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href={window.location.href} className="px-5 py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-medium">
              Refresh Page
            </a>
            <Link href="/login" className="px-5 py-2 rounded-md border border-slate-700 hover:border-slate-500">
              Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
