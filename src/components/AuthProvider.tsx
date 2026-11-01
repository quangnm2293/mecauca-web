'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  checkIsModerator,
  ensureProfile,
  fetchModerationQueue,
  signInWithGoogle,
  signOut as sbSignOut,
  supabase,
  type Profile,
} from '@/lib/supabase';

interface AuthState {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  isModerator: boolean;
  /** Total items waiting in the moderation queue (moderators only). */
  modPending: number;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  refreshModPending: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  ready: false,
  user: null,
  profile: null,
  isModerator: false,
  modPending: 0,
  signIn: async () => {},
  signOut: async () => {},
  setProfile: () => {},
  refreshModPending: async () => {},
});

export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [modPending, setModPending] = useState(0);
  const userIdRef = useRef<string | null>(null);

  const refreshModPending = useCallback(async () => {
    const q = await fetchModerationQueue();
    if (q) {
      setModPending(
        q.pendingSpots.length +
          q.pendingReports.length +
          q.pendingSuggestions.length +
          q.openFlags.length,
      );
    }
  }, []);

  const hydrate = useCallback(
    async (u: User | null) => {
      setUser(u);
      if (!u) {
        userIdRef.current = null;
        setProfile(null);
        setIsModerator(false);
        setModPending(0);
        return;
      }
      const sameUser = userIdRef.current === u.id;
      userIdRef.current = u.id;
      if (sameUser) return; // token refresh etc. — nothing to redo
      const [p, mod] = await Promise.all([ensureProfile(u), checkIsModerator(u.id)]);
      setProfile(p);
      setIsModerator(mod);
      if (mod) {
        const q = await fetchModerationQueue();
        if (q) {
          setModPending(
            q.pendingSpots.length +
              q.pendingReports.length +
              q.pendingSuggestions.length +
              q.openFlags.length,
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      await hydrate(data.session?.user ?? null);
      if (alive) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void hydrate(session?.user ?? null).then(() => {
        if (alive) setReady(true);
      });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      profile,
      isModerator,
      modPending,
      signIn: signInWithGoogle,
      signOut: async () => {
        await sbSignOut();
        await hydrate(null);
      },
      setProfile,
      refreshModPending,
    }),
    [ready, user, profile, isModerator, modPending, hydrate, refreshModPending],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
