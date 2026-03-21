import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetBusinessProfile } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError, error } = useGetBusinessProfile({
    query: { retry: false }
  });

  useEffect(() => {
    if (isError) {
      setLocation("/onboarding");
    }
  }, [isError, setLocation]);

  if (isLoading) {
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

  if (isError || !data) {
    return null;
  }

  return <>{children}</>;
}
