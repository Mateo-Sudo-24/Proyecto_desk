// src/context/storeAuth.jsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      // token + user completo incluyendo roles
      setUser: ({ token, user }) =>
        set({
          user: {
            ...user,
            token,
            roles: user.roles?.map(r => r.toLowerCase()) || [],
          },
        }),
      clearAuth: () => set({ user: null }),
    }),
    { name: "auth-token" }
  )
);

export default useAuthStore;
