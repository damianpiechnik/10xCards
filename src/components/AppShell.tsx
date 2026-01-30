import { AuthProvider } from "@/components/auth/AuthContext";
import MainNav from "@/components/MainNav";
import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
}

const AppShell = ({ children, initialUser = null, initialSession = null }: AppShellProps) => {
  return (
    <AuthProvider initialUser={initialUser} initialSession={initialSession}>
      <MainNav />
      {children}
    </AuthProvider>
  );
};

export default AppShell;
