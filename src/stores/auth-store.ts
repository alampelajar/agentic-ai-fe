import { create } from "zustand";
import { getCookie, setCookie, removeCookie } from "@/lib/cookies";

// Where older versions kept the access token, in a cookie any script could read.
// It is only cleared now.
const LEGACY_ACCESS_TOKEN = "thisisjustarandomstring";
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

/** Removes the access token that older versions left in a script-readable cookie. */
export function clearLegacyAccessToken() {
  removeCookie(LEGACY_ACCESS_TOKEN);
}

export const useAuthStore = create<AuthState>()((set) => {
  // The access token lives in memory only, so a script injected into the page
  // cannot find it in a cookie or storage. After a reload the route guard gets a
  // new one with the HTTP-only refresh-token cookie (see ensureSession).
  clearLegacyAccessToken();

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

      accessToken: "",

      setAccessToken: (accessToken) =>
        set((state) => {
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
