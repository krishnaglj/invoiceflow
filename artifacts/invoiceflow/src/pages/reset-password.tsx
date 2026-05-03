import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({
        title: "Invalid or expired link",
        description: "Please request a new password reset link.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });
      if (result?.error) {
        toast({
          title: "Reset failed",
          description: result.error.message || "The link may have expired. Please request a new one.",
          variant: "destructive",
        });
      } else {
        setDone(true);
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
          {!done ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose a strong password for your account.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">Password updated</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Your password has been reset successfully.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          {done ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button className="w-full h-11 font-semibold" onClick={() => setLocation("/sign-in")}>
                Go to sign in
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">
                This reset link is invalid or has expired.
              </p>
              <Button variant="outline" className="w-full h-11" asChild>
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    autoFocus
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Min 8 characters, one uppercase, one number</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-slate-700">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    {...form.register("confirm")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.confirm && (
                  <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset password
              </Button>

              <Link
                href="/forgot-password"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Request a new link instead
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
