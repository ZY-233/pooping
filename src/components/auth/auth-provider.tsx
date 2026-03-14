"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserProfile, upsertUserProfile } from "@/services/profile.service";
import { getUserSettings, upsertUserSettings } from "@/services/settings.service";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  nickname: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isAnonymousUser(user: User | null) {
  if (!user) {
    return false;
  }
  return user.is_anonymous === true || user.app_metadata?.provider === "anonymous";
}

function buildDefaultNickname(user: User) {
  const fromMeta = user.user_metadata?.nickname;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim().slice(0, 50);
  }

  const email = user.email?.split("@")[0];
  if (email && email.trim().length > 0) {
    return email.trim().slice(0, 50);
  }

  return "顺顺用户";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrapUserResources = useCallback(async (targetUser: User | null) => {
    if (!targetUser || isAnonymousUser(targetUser)) {
      setNickname(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const initialNickname = buildDefaultNickname(targetUser);
    const profileResult = await getUserProfile(supabase, targetUser.id);

    if (!profileResult.error && !profileResult.data) {
      await upsertUserProfile(supabase, {
        user_id: targetUser.id,
        nickname: initialNickname,
      });
    }

    const settingsResult = await getUserSettings(supabase, targetUser.id);
    if (!settingsResult.error && !settingsResult.data) {
      await upsertUserSettings(supabase, {
        user_id: targetUser.id,
        reminder_enabled: false,
        reminder_style: "gentle",
        reminder_time: null,
      });
    }

    const refreshedProfile = await getUserProfile(supabase, targetUser.id);
    if (!refreshedProfile.error && refreshedProfile.data) {
      setNickname(refreshedProfile.data.nickname ?? initialNickname);
    } else {
      setNickname(initialNickname);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user || isAnonymousUser(user)) {
      setNickname(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const profileResult = await getUserProfile(supabase, user.id);
    if (!profileResult.error && profileResult.data) {
      setNickname(profileResult.data.nickname ?? buildDefaultNickname(user));
      return;
    }

    setNickname(buildDefaultNickname(user));
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const timer = setTimeout(() => {
      void (async () => {
        const current = await supabase.auth.getSession();
        const nextSession = current.data.session;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await bootstrapUserResources(nextSession?.user ?? null);
        setIsLoading(false);
      })();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setTimeout(() => {
        void bootstrapUserResources(nextSession?.user ?? null);
      }, 0);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [bootstrapUserResources]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isGuest: !user || isAnonymousUser(user),
      nickname,
      refreshProfile,
      signOut,
    }),
    [isLoading, nickname, refreshProfile, session, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
