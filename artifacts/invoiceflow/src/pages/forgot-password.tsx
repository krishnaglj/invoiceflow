import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result?.error) {
        const msg = result.error.message ?? "";
        const isGoogleAccount =
          msg.toLowerCase().includes("social") ||
          msg.toLowerCase().includes("provider") ||
          msg.toLowerCase().includes("oauth") ||
          msg.toLowerCase().includes("google");
        if (isGoogleAccount) {
          toast({
            title: "Google account detected",
            description: "This email uses Google sign-in. Please use 'Continue with Google' on the sign-in page.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Could not send reset email",
            description: msg || "No account found with that email address.",
            variant: "destructive",
          });
        }
      } else {
        setSentTo(data.email);
        setSent(true);
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/40 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl text-foreground">InvoiceFlow</span>
          </Link>
          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Enter your email and we'll send you a secure reset link.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">Check your inbox</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                We've sent a reset link to <strong>{sentTo}</strong>
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <MailCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The link will expire in <strong>1 hour</strong>. If you don't see the email,
                  check your spam folder.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => { setSent(false); form.reset(); }}
              >
                Try a different email
              </Button>
              <Link href="/sign-in" className="block text-center text-sm text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-11"
                  autoFocus
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send reset link
              </Button>

              <Link
                href="/sign-in"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
