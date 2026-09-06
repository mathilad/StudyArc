import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAccess } from "../context/AccessContext";
import { useAuth } from "../context/AuthContext";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function AccessGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();
  const { loading, blocked, paidEnabled, isPremium, isAdmin } = useAccess();

  useEffect(() => {
    if (authLoading || loading || !session) return;
    if (blocked) {
      if (pathname !== "/blocked") router.replace("/blocked");
      return;
    }
    if (!isAdmin && paidEnabled && !isPremium) {
      if (pathname !== "/activate-plan") router.replace("/activate-plan");
      return;
    }
    if (pathname === "/blocked" || pathname === "/activate-plan" || AUTH_ROUTES.includes(pathname)) {
      router.replace("/");
    }
  }, [authLoading, blocked, isAdmin, isPremium, loading, paidEnabled, pathname, router, session]);

  return null;
}
