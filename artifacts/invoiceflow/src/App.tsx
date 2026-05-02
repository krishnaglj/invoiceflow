import { useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "./pages/landing";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import Onboarding from "./pages/onboarding";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import CustomerDetail from "./pages/customers/detail";
import Products from "./pages/products";
import InvoicesList from "./pages/invoices";
import InvoiceForm from "./pages/invoices/form";
import InvoiceDetail from "./pages/invoices/detail";
import Settings from "./pages/settings";
import EstimatesList from "./pages/estimates";
import EstimateForm from "./pages/estimates/form";
import EstimateDetail from "./pages/estimates/detail";
import Expenses from "./pages/expenses";
import Reports from "./pages/reports";

import { AuthGuard } from "./components/auth-guard";
import { AppLayout } from "./components/layout";
import { useSession } from "./lib/auth-client";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <AppLayout>
        <Component />
      </AppLayout>
    </AuthGuard>
  );
}

function HomeRedirect() {
  const { data: session, isPending } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isPending && session?.user) {
      setLocation("/dashboard");
    }
  }, [isPending, session, setLocation]);

  if (isPending) return null;
  if (session?.user) return null;
  return <Landing />;
}

function OnboardingRoute() {
  const { data: session, isPending } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isPending && !session?.user) {
      setLocation("/sign-in");
    }
  }, [isPending, session, setLocation]);

  if (isPending) return null;
  if (!session?.user) return null;
  return <Onboarding />;
}

function SessionCacheInvalidator() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const prevUserIdRef = { current: undefined as string | null | undefined };

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      qc.clear();
    }
    prevUserIdRef.current = userId;
  }, [session?.user?.id]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />

      <Route path="/onboarding" component={OnboardingRoute} />

      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/customers"><ProtectedRoute component={Customers} /></Route>
      <Route path="/customers/:id"><ProtectedRoute component={CustomerDetail} /></Route>
      <Route path="/products"><ProtectedRoute component={Products} /></Route>
      <Route path="/invoices"><ProtectedRoute component={InvoicesList} /></Route>
      <Route path="/invoices/new"><ProtectedRoute component={InvoiceForm} /></Route>
      <Route path="/invoices/:id/edit"><ProtectedRoute component={InvoiceForm} /></Route>
      <Route path="/invoices/:id"><ProtectedRoute component={InvoiceDetail} /></Route>
      <Route path="/estimates"><ProtectedRoute component={EstimatesList} /></Route>
      <Route path="/estimates/new"><ProtectedRoute component={EstimateForm} /></Route>
      <Route path="/estimates/:id/edit"><ProtectedRoute component={EstimateForm} /></Route>
      <Route path="/estimates/:id"><ProtectedRoute component={EstimateDetail} /></Route>
      <Route path="/expenses"><ProtectedRoute component={Expenses} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <SessionCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
