import { create } from "zustand";
import { getCookie, setCookie, removeCookie } from "@/lib/cookies";

const ACCESS_TOKEN = "thisisjustarandomstring";
const AUTH_USER = "agentic_ai_user";

interface AuthUser {
  accountNo: string;
  email: string;
  role: string[];
  exp: number;
  name?: string;
  avatar?: string;
}

interface AuthState {
  auth: {
    user: AuthUser | null;
    setUser: (user: AuthUser | null) => void;
    accessToken: string;
    setAccessToken: (accessToken: string) => void;
    resetAccessToken: () => void;
    reset: () => void;
  };
}

export const useAuthStore = create<AuthState>()((set) => {
  // Restore access token
  const cookieToken = getCookie(ACCESS_TOKEN);
  const initToken = cookieToken ? JSON.parse(cookieToken) : "";

  // Restore user
  const cookieUser = getCookie(AUTH_USER);

  let initUser: AuthUser | null = null;

  if (cookieUser) {
    try {
      // Kept even when exp has passed: exp only says the access token may be stale. The
      // route guard renews it with the refresh-token cookie, and signs out only if that fails.
      initUser = JSON.parse(cookieUser) as AuthUser;
    } catch {
      initUser = null;
      removeCookie(AUTH_USER);
    }
  }

  return {
    auth: {
      user: initUser,

      setUser: (user) =>
        set((state) => {
          if (user) {
            setCookie(AUTH_USER, JSON.stringify(user));
          } else {
            removeCookie(AUTH_USER);
          }

          return {
            ...state,
            auth: {
              ...state.auth,
              user,
            },
          };
        }),

      accessToken: initToken,

      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken));

          return {
            ...state,
            auth: {
              ...state.auth,
              accessToken,
            },
          };
        }),

      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN);

          return {
            ...state,
            auth: {
              ...state.auth,
              accessToken: "",
            },
          };
        }),

      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN);
          removeCookie(AUTH_USER);

          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              accessToken: "",
            },
          };
        }),
    },
  };
});
