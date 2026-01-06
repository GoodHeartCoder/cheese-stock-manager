import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InventoryProvider } from "@/context/InventoryContext";
import Dashboard from "./pages/Dashboard";
import Warehouse from "./pages/Warehouse";
import Formula from "./pages/Formula";
import Production from "./pages/Production";
import History from "./pages/History";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <InventoryProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/formula" element={<Formula />} />
            <Route path="/production" element={<Production />} />
            <Route path="/history" element={<History />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </InventoryProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
