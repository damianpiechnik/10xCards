import UserMenu from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";

const MainNav = () => {
  const { session, isLoading } = useAuth();

  return (
    <nav className="w-full border-b bg-background/80 backdrop-blur" aria-label="Główna nawigacja">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <a href="/" className="text-sm font-semibold text-foreground">
          10xCards
        </a>
        {session ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href="/library">Biblioteka</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/flashcards/new">Dodaj fiszkę</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/generate">Generuj</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/reviews">Powtórki</a>
            </Button>
          </div>
        ) : null}
        {isLoading ? (
          <Button variant="outline" disabled>
            Ładowanie...
          </Button>
        ) : session ? (
          <UserMenu />
        ) : (
          <Button asChild variant="outline">
            <a href="/auth/sign-in">Zaloguj się</a>
          </Button>
        )}
      </div>
    </nav>
  );
};

export default MainNav;
