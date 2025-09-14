import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Calendar, Plane, Hotel } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/lib/firebase";

interface Deal {
  _id: string;
  title: string;
  category: "hotel" | "flight" | "package";
  destination: string;
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  startDate?: string;
  endDate?: string;
  description: string;
}

const mockDeals: Deal[] = [
  {
    _id: "deal1",
    title: "Luxury Paris Hotel Stay",
    category: "hotel",
    destination: "Paris, France",
    originalPrice: 500,
    discountedPrice: 350,
    discount: 30,
    description: "5-star hotel near the Eiffel Tower with breakfast included.",
  },
  {
    _id: "deal2",
    title: "Round-Trip Flight to Tokyo",
    category: "flight",
    destination: "Tokyo, Japan",
    originalPrice: 800,
    discountedPrice: 600,
    discount: 25,
    startDate: "2026-01-15",
    endDate: "2026-01-20",
    description: "Premium economy flight to Tokyo with flexible cancellation.",
  },
  {
    _id: "deal3",
    title: "Bali Vacation Package",
    category: "package",
    destination: "Bali, Indonesia",
    originalPrice: 1200,
    discountedPrice: 900,
    discount: 25,
    startDate: "2026-02-10",
    endDate: "2026-02-15",
    description: "All-inclusive package with flights, resort, and tours.",
  },
  {
    _id: "deal4",
    title: "New York City Hotel Deal",
    category: "hotel",
    destination: "New York, NY, USA",
    originalPrice: 400,
    discountedPrice: 280,
    discount: 30,
    description: "Boutique hotel in Manhattan, close to Times Square.",
  },
  {
    _id: "deal5",
    title: "Flight to London",
    category: "flight",
    destination: "London, UK",
    originalPrice: 700,
    discountedPrice: 560,
    discount: 20,
    startDate: "2025-12-20",
    endDate: "2025-12-27",
    description: "Direct flight to London with free date changes.",
  },
];

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setDeals(mockDeals); // Use mock data
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-purple-500"
        >
          <Plane className="w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/signin" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-12 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 text-center tracking-tight"
          >
            Exclusive Travel Deals
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Discover the best offers on flights, hotels, and vacation packages for your next adventure.
          </motion.p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-16">
        {deals.length === 0 ? (
          <div className="text-center py-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Deals Available</h2>
            <p className="text-gray-600 mb-4">Check back soon for new offers!</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4 max-w-3xl mx-auto">
            {deals.map((deal) => (
              <li
                key={deal._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {deal.category === "flight" ? (
                      <Plane className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Hotel className="w-4 h-4 text-purple-500" />
                    )}
                    <span className="font-semibold text-gray-800">{deal.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    {deal.destination}
                  </div>
                  {deal.startDate && deal.endDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      {new Date(deal.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                      {new Date(deal.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="line-through text-gray-500">${deal.originalPrice.toFixed(2)}</span>
                    <span className="font-medium text-purple-500">${deal.discountedPrice.toFixed(2)}</span>
                    <span className="text-green-600">({deal.discount}% OFF)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{deal.description}</p>
                </div>
                <Link to={`/book/${deal._id}`} className="mt-2 sm:mt-0">
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-1 text-sm">
                    Book Now
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Deals;