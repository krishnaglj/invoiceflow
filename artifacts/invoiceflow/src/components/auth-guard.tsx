import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/lib/auth-client";
import { useGetBusinessProfile } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = useSession();
  const isSignedIn = !!session?.user;

  const { data: profile, isLoading: profileLoading, isError } = useGetBusinessProfile({
    query: { enabled: isSignedIn, retry: false },
  });

  useEffect(() => {
    if (!isPending && !isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    if (!isPending && isSignedIn && !profileLoading && isError) {
      setLocation("/onboarding");
    }
  }, [isPending, isSignedIn, profileLoading, isError, setLocation]);

  if (isPending || (isSignedIn && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || isError || !profile) {
    return null;
  }

  return <>{children}</>;
}
