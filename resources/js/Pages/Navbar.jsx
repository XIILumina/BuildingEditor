export default function Navbar({ auth }) {
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between">   
        <div className="text-lg font-bold">CAD Project</div>
        <div>
            {auth.user ? (
                <div className="flex items-center space-x-4">
                    <span>Welcome, {auth.user.name}</span>
                    <a href="/logout" className="bg-red-500 px-3 py-1 rounded">Logout</a>
                </div>
            ) : (
                <div className="space-x-4">
                    <a href="/login" className="bg-blue-500 px-3 py-1 rounded">Login</a>
                    <a href="/register" className="bg-green-500 px-3 py-1 rounded">Register</a>
                    {/* <a href="/projects" className="bg-gray-700 px-3 py-1 rounded">Projects</a> */}
                </div>
            )}
        </div>
    </nav>
  );
}   
