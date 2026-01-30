import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabaseClient } from "@/db/supabase.client";

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session ?? null);
      setIsLoading(false);
    };

    void loadSession();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
};
