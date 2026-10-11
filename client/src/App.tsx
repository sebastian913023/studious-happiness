import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Shell } from "@/components/Shell";
import Overview from "@/pages/Overview";
import Pricing from "@/pages/Pricing";
import Capabilities from "@/pages/Capabilities";
import Battlecards from "@/pages/Battlecards";
import Playbook from "@/pages/Playbook";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <Router hook={useHashLocation}>
            <Shell>
              <ErrorBoundary>
                <Switch>
                  <Route path="/" component={Overview} />
                  <Route path="/pricing" component={Pricing} />
                  <Route path="/capabilities" component={Capabilities} />
                  <Route path="/battlecards" component={Battlecards} />
                  <Route path="/playbook" component={Playbook} />
                  <Route component={NotFound} />
                </Switch>
              </ErrorBoundary>
            </Shell>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
