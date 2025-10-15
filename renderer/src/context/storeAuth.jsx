import { create } from "zustand";
import { persist } from "zustand/middleware";

const storeAuth = create(
  persist(
    (set) => ({
      token: null,    // token final (después de OTP)
      rol: null,      // rol seleccionado en login
      setToken: (token) => set({ token }),
      setRol: (rol) => set({ rol }),
      clearAuth: () => set({ token: null, rol: null }),
    }),
    { name: "auth-token" }
  )
);

export default storeAuth;
