import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }){
  // default to system preference
  const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || (prefersDark ? "dark" : "light"));

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    // Listen to system changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const sys = e.matches ? "dark" : "light";
      // if user didn't explicitly set theme (i.e. value from localStorage absent), update
      if (!localStorage.getItem("theme")) setTheme(sys);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(){ return useContext(ThemeContext); }
