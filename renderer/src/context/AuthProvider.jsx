import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import useFetch from "../hooks/useFetch";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { fetchDataBackend } = useFetch();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Guardar token en localStorage
  useEffect(() => {
    if (token) localStorage.setItem("userToken", token);
    else localStorage.removeItem("userToken");
  }, [token]);

  // Cargar token al montar
  useEffect(() => {
    const savedToken = localStorage.getItem("userToken");
    if (savedToken) setToken(savedToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("userToken");
    navigate("/login");
  }, [navigate]);

  const verifyToken = useCallback(async () => {
    if (!token) return false;
    try {
      const res = await fetchDataBackend("/auth/verify", null, "POST", false);
      if (res.success && res.valid) return true;
      logout();
      return false;
    } catch {
      logout();
      return false;
    }
  }, [token, fetchDataBackend, logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, logout, verifyToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
