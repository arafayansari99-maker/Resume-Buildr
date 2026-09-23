import React from "react";
import { motion } from "framer-motion";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { NotificationProvider } from "@/hooks/use-notifications";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";

import DashboardPage from "./pages/dashboard";
import ResumesPage from "./pages/resumes";
import JobsPage from "./pages/jobs";
import AnalyzePage from "./pages/analyze";
import RankPage from "./pages/rank";
import ResultsPage from "./pages/results";
import ResultDetailPage from "./pages/result-detail";
import ComparePage from "./pages/compare";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/resumes" component={ResumesPage} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/analyze" component={AnalyzePage} />
        <Route path="/rank" component={RankPage} />
        <Route path="/compare" component={ComparePage} />
        <Route path="/results" component={ResultsPage} />
        <Route path="/results/:id" component={ResultDetailPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your workspace...</div>;
  }

  if (!user) return <AuthPage />;

  return (
    <NotificationProvider>
      <TooltipProvider>
        <div className="app-shell">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
            className="app-shell__content"
          >
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </motion.div>
        </div>
        <Toaster />
      </TooltipProvider>
    </NotificationProvider>
  );
}

export default App;
