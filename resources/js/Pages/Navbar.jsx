import { Link, Inertia } from '@inertiajs/react';

function Navbar({ auth }) {
  return (
    <nav className="flex items-center justify-between bg-gray-900 text-white p-4">
      <Link href="/dashboard" className="font-bold text-xl">Blueprint App</Link>

      <div className="space-x-4">
        {auth?.user ? (
          <>
            <Link href="/dashboard" className="hover:text-blue-300">Dashboard</Link>
            <Link href="/profile" className="hover:text-blue-300">Profile</Link>
            <button
              onClick={() => Inertia.post('/logout')}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-blue-300">Login</Link>
            <Link href="/register" className="hover:text-blue-300">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
