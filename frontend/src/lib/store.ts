import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, UserProfile } from "./api";

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Profile
  profileOnboarded: boolean;
  userProfile: UserProfile | null;
  setProfileOnboarded: (val: boolean) => void;
  setUserProfile: (profile: UserProfile | null) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("session_token", token);
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("session_token");
        }
        set({ user: null, token: null, isAuthenticated: false, userProfile: null });
      },

      // UI
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Profile
      profileOnboarded: false,
      userProfile: null,
      setProfileOnboarded: (val) => set({ profileOnboarded: val }),
      setUserProfile: (profile) => set({ userProfile: profile, profileOnboarded: !!profile }),

      // Theme
      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "job-auto-store" }
  )
);
