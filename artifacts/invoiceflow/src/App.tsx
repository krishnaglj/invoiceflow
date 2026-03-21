import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "./pages/landing";
import AuthPage from "./pages/auth";
import Onboarding from "./pages/onboarding";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import CustomerDetail from "./pages/customers/detail";
import Products from "./pages/products";
import InvoicesList from "./pages/invoices";
import InvoiceForm from "./pages/invoices/form";
import InvoiceDetail from "./pages/invoices/detail";
import Settings from "./pages/settings";

import { AuthGuard } from "./components/auth-guard";
import { AppLayout } from "./components/layout";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login"><AuthPage isLogin={true} /></Route>
      <Route path="/signup"><AuthPage isLogin={false} /></Route>
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      
      <Route path="/customers"><ProtectedRoute component={Customers} /></Route>
      <Route path="/customers/:id"><ProtectedRoute component={CustomerDetail} /></Route>
      
      <Route path="/products"><ProtectedRoute component={Products} /></Route>
      
      <Route path="/invoices"><ProtectedRoute component={InvoicesList} /></Route>
      <Route path="/invoices/new"><ProtectedRoute component={InvoiceForm} /></Route>
      <Route path="/invoices/:id/edit"><ProtectedRoute component={InvoiceForm} /></Route>
      <Route path="/invoices/:id"><ProtectedRoute component={InvoiceDetail} /></Route>
      
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
