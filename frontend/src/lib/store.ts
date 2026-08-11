import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserAuth {
  email: string;
  name: string;
  token: string;
}

interface AppState {
  // Auth
  user: UserAuth | null;
  isAuthenticated: boolean;
  login: (email: string, name: string) => void;
  logout: () => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Profile
  profileOnboarded: boolean;
  setProfileOnboarded: (val: boolean) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      login: (email, name) =>
        set({
          user: { email, name, token: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}` },
          isAuthenticated: true,
        }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // UI
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Profile
      profileOnboarded: false,
      setProfileOnboarded: (val) => set({ profileOnboarded: val }),

      // Theme
      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "job-auto-store" }
  )
);
