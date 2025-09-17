import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import GroupTripPlanner from "./pages/GroupTripPlanner";
import IndividualTripPlanner from "./pages/IndividualTripPlanner";
import Transport from "./pages/Transport";
import Hotels from "./pages/Hotels";
import NotFound from "./pages/NotFound";
import About from './pages/About';
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TripPlanner from "./pages/TripPlanner";
import MyTrips from "./pages/MyTrips";
import Deals from "./pages/Deals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/about" element={<About />} />
          <Route path="/trip-planner" element={<TripPlanner />} />
          <Route path="/group-trip" element={<GroupTripPlanner />} />
          <Route path="/group-trip/:tripId" element={<GroupTripPlanner />} />
          <Route path="/solo-trip/:tripId" element={<IndividualTripPlanner />} />
          <Route path="/solo-trip" element={<IndividualTripPlanner />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;