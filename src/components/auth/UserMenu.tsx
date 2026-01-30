import { useAuth } from "@/components/auth/AuthContext";
import SignOutButton from "@/components/auth/SignOutButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const getInitials = (email: string): string => {
  const parts = email.split("@");
  if (parts.length > 0 && parts[0].length > 0) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return "U";
};

const UserMenu = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userEmail = user.email || "Użytkownik";
  const initials = getInitials(userEmail);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
      </div>
      <SignOutButton />
    </div>
  );
};

export default UserMenu;
