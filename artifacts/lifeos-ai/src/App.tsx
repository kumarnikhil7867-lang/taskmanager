import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { Layout } from "./components/layout";

import Dashboard from "./pages/dashboard";
import Chat from "./pages/chat";
import Tasks from "./pages/tasks";
import Activity from "./pages/activity";
import Settings from "./pages/settings";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="lifeos-theme">
          <TooltipProvider>
            <Layout>
              <Switch>
                <Route path="/">
                  <Redirect to="/dashboard" />
                </Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/chat" component={Chat} />
                <Route path="/tasks" component={Tasks} />
                <Route path="/activity" component={Activity} />
                <Route path="/settings" component={Settings} />
                <Route>
                  <Redirect to="/dashboard" />
                </Route>
              </Switch>
            </Layout>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
