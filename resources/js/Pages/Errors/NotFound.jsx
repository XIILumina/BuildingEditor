import { Head, Link } from "@inertiajs/react";

export default function NotFound() {
  return (
    <>
      <Head title="404 - Page Not Found" />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <p className="text-sky-400 text-sm tracking-[0.25em] uppercase mb-3">Error 404</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Page not found</h1>
          <p className="text-slate-300 mb-8">
            The page you requested does not exist or was moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="px-5 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium">
              Back to Home
            </Link>
            <Link href="/dashboard" className="px-5 py-2 rounded-md border border-slate-700 hover:border-slate-500">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
