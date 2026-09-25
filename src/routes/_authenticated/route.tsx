import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const { auth } = useAuthStore.getState();

    const isAuthenticated =
      !!auth.accessToken && !!auth.user && auth.user.exp > Date.now();

    if (!isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      });
    }
  },

  component: AuthenticatedLayout,
});
