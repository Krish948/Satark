// Auth + role context. Subscribes to auth state, fetches role from user_roles.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, role: null, loading: true, signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe FIRST (sync state updates only)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession?.user) {
        setRole(null);
      } else {
        // Defer DB call to avoid deadlock inside callback
        setTimeout(() => fetchRole(newSession.user.id), 0);
      }
    });

    // 2. Then load existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchRole(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchRole = async (uid: string) => {
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid),
      supabase
        .from("profiles")
        .select("is_active")
        .eq("id", uid)
        .maybeSingle(),
    ]);

    if (profileData && profileData.is_active === false) {
      await supabase.auth.signOut();
      setRole(null);
      return;
    }

    if (roleData?.some((r) => r.role === "admin")) setRole("admin");
    else if (roleData && roleData.length > 0) setRole("user");
    else setRole("user");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <Ctx.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
