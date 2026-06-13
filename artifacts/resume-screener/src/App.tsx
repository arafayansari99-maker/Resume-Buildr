import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { NotificationProvider } from "@/hooks/use-notifications";
import NotFound from "@/pages/not-found";

import DashboardPage from "./pages/dashboard";
import ResumesPage from "./pages/resumes";
import JobsPage from "./pages/jobs";
import AnalyzePage from "./pages/analyze";
import RankPage from "./pages/rank";
import ResultsPage from "./pages/results";
import ResultDetailPage from "./pages/result-detail";

const queryClient = new QueryClient();

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
      <NotificationProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
