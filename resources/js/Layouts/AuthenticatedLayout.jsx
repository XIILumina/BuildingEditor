import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
  PenTool,
} from "lucide-react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import Dropdown from "@/Components/Dropdown";
import NavLink from "@/Components/NavLink";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { Link, usePage } from "@inertiajs/react";

export default function AuthenticatedLayout({ header, children }) {
  const user = usePage().props.auth.user;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-gray-100 flex flex-col">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 backdrop-blur-md bg-gray-900/70 border-b border-cyan-800/40 shadow-cyan-500/10 shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          {/* Left side */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <ApplicationLogo className="h-9 w-auto text-cyan-400" />
              <span className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
                BlueprintApp
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink
              href={route("dashboard")}
              active={route().current("dashboard")}
            >
              <div className="flex items-center space-x-2">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
            </NavLink>

            {/* User dropdown */}
            <Dropdown>
              <Dropdown.Trigger>
                <button className="flex items-center space-x-2 text-gray-300 hover:text-cyan-400 transition">
                  <User size={18} />
                  <span>{user.name}</span>
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content className="bg-gray-900 border border-gray-700">
                <Dropdown.Link href={route("profile.edit")}>
                  Profile
                </Dropdown.Link>
                <Dropdown.Link
                  href={route("logout")}
                  method="post"
                  as="button"
                  className="text-red-400 hover:text-red-500"
                >
                  <LogOut size={16} className="inline mr-2" />
                  Logout
                </Dropdown.Link>
              </Dropdown.Content>
            </Dropdown>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="md:hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
          >
            {showMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-gray-950/90 border-t border-gray-800 px-4 py-3 space-y-3"
            >
              <ResponsiveNavLink
                href={route("dashboard")}
                active={route().current("dashboard")}
              >
                Dashboard
              </ResponsiveNavLink>
              <ResponsiveNavLink href={route("profile.edit")}>
                Profile
              </ResponsiveNavLink>
              <ResponsiveNavLink method="post" href={route("logout")} as="button">
                Logout
              </ResponsiveNavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Page Header */}
      {header && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900/70 backdrop-blur-md shadow-inner border-b border-cyan-800/20"
        >
          <div className="max-w-7xl mx-auto py-6 px-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
              {header}
            </h2>
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1 max-w-7xl mx-auto p-6"
      >
        {children}
      </motion.main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-gray-800 text-gray-500 text-sm">
        © {new Date().getFullYear()} BlueprintApp — Designed with ⚡ React,
        Framer Motion, and TailwindCSS
      </footer>
    </div>
  );
}
