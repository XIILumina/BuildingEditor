import { Head, Link } from "@inertiajs/react";

export default function ServerError() {
  return (
    <>
      <Head title="500 - Server Error" />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <p className="text-rose-400 text-sm tracking-[0.25em] uppercase mb-3">Error 500</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Something went wrong</h1>
          <p className="text-slate-300 mb-8">
            An unexpected server error occurred. Please try again in a moment.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href={window.location.href} className="px-5 py-2 rounded-md bg-rose-400 hover:bg-rose-300 text-slate-950 font-medium">
              Retry
            </a>
            <Link href="/" className="px-5 py-2 rounded-md border border-slate-700 hover:border-slate-500">
              Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
