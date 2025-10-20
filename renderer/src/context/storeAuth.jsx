import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: ({ token, user }) => set({ user: { ...user, token } }),
      clearAuth: () => set({ user: null }),
    }),
    { name: "auth-token" }
  )
);

export default useAuthStore;
