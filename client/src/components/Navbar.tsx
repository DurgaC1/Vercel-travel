import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, User, X, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Notifications from "@/components/Notifications";

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Mock notification data for unread count (replace with real data if fetching from API)
  const mockNotifications = [
    { _id: "notif1", status: "pending" },
    { _id: "notif2", status: "pending" },
    { _id: "notif3", status: "pending" },
    { _id: "notif4", status: "read" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        user.getIdToken().then((token) => localStorage.setItem("token", token));
        const unread = mockNotifications.filter((notif) => notif.status === "pending").length;
        setUnreadCount(unread);
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("token");
        setUnreadCount(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for custom event to toggle Notifications dropdown
    const handleToggleNotifications = () => {
      setShowNotifications((prev) => !prev);
      setIsMobileMenuOpen(false); // Close mobile menu when notifications toggle
    };
    window.addEventListener("toggleNotifications", handleToggleNotifications);
    return () => window.removeEventListener("toggleNotifications", handleToggleNotifications);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      localStorage.removeItem("token");
      setUnreadCount(0);
      navigate("/");
    } catch (error: any) {
      console.error("Sign out failed:", error.message);
    }
  };

  const navLinks = [
    { to: "/discover", label: "Discover" },
    { to: "/about", label: "About" },
    { to: "/trip-planner", label: "Plan Your Trip" },
    { to: "/my-trips", label: "My Trips" },
    { to: "/hotels", label: "Hotels" },
    { to: "/transport", label: "Transport" },
    { to: "/deals", label: "Deals" },
  ];

  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] rounded-lg flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">
              Travel Genie
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <motion.div
                key={link.to}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link
                  to={link.to}
                  className="text-gray-700 hover:text-purple-500 font-medium transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn && (
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                onClick={toggleNotifications}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full"></span>
                )}
              </Button>
            )}
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                onClick={handleSignOut}
              >
                <User className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                onClick={() => navigate("/signin")}
              >
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-full px-6 hidden md:flex"
              onClick={() => navigate("/trip-planner")}
            >
              Plan Now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-700 hover:text-purple-500"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {showNotifications && isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 right-4 md:right-8 z-50 w-[90vw] md:w-[32rem]"
            >
              <Notifications onUpdateUnreadCount={setUnreadCount} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="flex flex-col items-center space-y-4 py-6">
                {navLinks.map((link) => (
                  <motion.div
                    key={link.to}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Link
                      to={link.to}
                      className="text-gray-700 hover:text-purple-500 font-medium text-lg transition-colors duration-200"
                      onClick={toggleMobileMenu}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                {isLoggedIn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                    onClick={toggleNotifications}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                )}
                {isLoggedIn ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                    onClick={() => {
                      toggleMobileMenu();
                      handleSignOut();
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-purple-500 hover:bg-purple-50"
                    onClick={() => {
                      toggleMobileMenu();
                      navigate("/signin");
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-full px-6"
                  onClick={() => {
                    toggleMobileMenu();
                    navigate("/trip-planner");
                  }}
                >
                  Plan Now
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;