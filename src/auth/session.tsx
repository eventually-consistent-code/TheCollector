/**
 * Purpose: Session context — initial getSession + onAuthStateChange, exposed
 * to the router for Stack.Protected gating and to the db layer for user id.
 * Author(s): John Reed
 */

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './client';

interface SessionState {
  session: Session | null;
  // false until the initial getSession resolves — gate rendering on it.
  ready: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, ready: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, ready: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, ready: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, ready: true });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
