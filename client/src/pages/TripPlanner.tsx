import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Navigate, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { Users, Plane, User } from "lucide-react";

interface TripPlan {
  tripType: "individual" | "group";
}

const TripPlanner = () => {
  const navigate = useNavigate();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle trip type selection and redirect
  const handleTripTypeChange = (value: "individual" | "group") => {
    const newTripPlan = { tripType: value };
    setTripPlan(newTripPlan);
    setError(null);
    navigate(value === "group" ? "/group-trip" : "/solo-trip", {
      state: { tripPlan: newTripPlan },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-purple-500"
        >
          <Plane className="w-8 h-8" />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div
        className="relative bg-cover bg-center py-24 sm:py-36"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/3467150/pexels-photo-3467150.jpeg?auto=compress&cs=tinysrgb&w=1920')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-blue-900/80" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Your Journey Starts Here
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Choose your adventure type to create a personalized travel experience with Travel Genie.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTripTypeChange("individual")}
              className="bg-white rounded-lg p-6 cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <User className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Solo Trip</h3>
              <p className="text-gray-600">Embark on a personal adventure tailored just for you.</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTripTypeChange("group")}
              className="bg-white rounded-lg p-6 cursor-pointer shadow-md hover:shadow-lg transition-shadow"
            >
              <Users className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Group Trip</h3>
              <p className="text-gray-600">Plan an unforgettable journey with friends or family.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 shadow-sm max-w-2xl mx-auto"
          >
            {error}
          </motion.div>
        )}
        <div className="text-center max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6"
          >
            Ready to Explore?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-gray-600 mb-8 leading-relaxed"
          >
            Select whether you're traveling solo or with a group, and our AI will help craft your perfect itinerary.
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => document.querySelector(".container")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-10 rounded-full text-lg shadow-lg"
            >
              <Users className="w-5 h-5 mr-2" />
              Choose Your Trip Type
            </Button>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TripPlanner;