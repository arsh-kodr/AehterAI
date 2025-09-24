import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

/*
AuthContext:
- stores current user object (from backend) and helper methods login/logout/register
- backend sets cookie JWT on login/register, but server also returns user; we store user in local state
*/

const AuthContext = createContext();

export function AuthProvider({ children }){
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // try to get user info from /auth/me (optional) — backend must implement. If not, we skip.
  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const res = await api.get("/auth/me"); // if backend has this
        if (mounted) setUser(res.data.user);
      } catch (err) {
        // ignore if endpoint absent
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUser();
    return () => (mounted = false);
  }, []);

  async function login({ email, password }){
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.user || null);
    return res;
  }

  async function register({ firstName, lastName, email, password }){
    const res = await api.post("/auth/register", {
      fullName: { firstName, lastName },
      email, password
    });
    setUser(res.data.user || null);
    return res;
  }

  async function logout(){
    // flush local state, server logout endpoint optional
    try {
      await api.post("/auth/logout").catch(()=>{}); // optional
    } catch {}
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(){
  return useContext(AuthContext);
}
