import { useEffect } from "react";

import { useAuthSession } from "@/components/hooks/useAuthSession";

interface AuthRedirectProps {
  to?: string;
}

const AuthRedirect = ({ to = "/library" }: AuthRedirectProps) => {
  const { session, isLoading } = useAuthSession();

  useEffect(() => {
    if (isLoading || !session) {
      return;
    }

    window.location.assign(to);
  }, [isLoading, session, to]);

  return null;
};

export default AuthRedirect;
