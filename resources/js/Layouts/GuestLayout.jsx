import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="mb-8">
                <Link href="/">
                    <ApplicationLogo className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                </Link>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8">
                {children}
            </div>

            <footer className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} – Built with Laravel & Inertia
            </footer>
        </div>
    );
}
