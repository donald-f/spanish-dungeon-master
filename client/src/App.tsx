import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";
import PasswordGate from "@/components/PasswordGate";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PasswordGate>
          <Router />
        </PasswordGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
