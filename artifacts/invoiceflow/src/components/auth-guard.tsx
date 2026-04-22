import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/lib/auth-client";
import { useGetBusinessProfile } from "@workspace/api-client-react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = useSession();
  const isSignedIn = !!session?.user;

  const { data: profile, isLoading: profileLoading, isError, error } = useGetBusinessProfile({
    query: { enabled: isSignedIn, retry: false },
  });

  const errorStatus = (error as { status?: number } | null)?.status;
  const isNoProfile = isError && errorStatus === 404;
  const isServerError = isError && errorStatus !== 404;

  useEffect(() => {
    if (!isPending && !isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    if (!isPending && isSignedIn && !profileLoading && isNoProfile) {
      setLocation("/onboarding");
    }
  }, [isPending, isSignedIn, profileLoading, isNoProfile, setLocation]);

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

  if (!isSignedIn || isNoProfile || !profile) {
    return null;
  }

  if (isServerError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Unable to connect</h2>
          <p className="text-muted-foreground text-sm">The server couldn't be reached. Please try again in a moment.</p>
          <Button onClick={() => window.location.reload()} className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
