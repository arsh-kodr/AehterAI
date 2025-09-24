import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function NavBar(){
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <header className="flex items-center justify-between py-4 px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-lg font-bold glow">⚡ Aether AI</Link>
      </div>

      <nav className="flex items-center gap-4">
        <Link to="/" className="text-sm hover:text-indigo-300/90">Home</Link>
        <Link to="/chat" className="text-sm hover:text-indigo-300/90">Chat</Link>

        {user ? (
          <>
            <span className="text-sm opacity-80 hidden sm:inline">{user.fullName?.firstName || user.email}</span>
            <button onClick={() => { logout(); navigate("/login"); }} className="px-3 py-1 rounded bg-white/6">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm">Login</Link>
            <Link to="/register" className="text-sm px-3 py-1 rounded bg-white/6">Sign up</Link>
          </>
        )}

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="ml-2 p-2 rounded bg-white/4"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </nav>
    </header>
  );
}
