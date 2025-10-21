import React from 'react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8">
                {children}
            </div>

        </div>
    );
}
