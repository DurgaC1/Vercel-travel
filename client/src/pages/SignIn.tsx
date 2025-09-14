import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";

interface SignInResponse {
  success: boolean;
  token?: string;
  message?: string;
}

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        navigate("/"); // Redirect to home route if already authenticated
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: "", password: "" };

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem("token", token);
      navigate("/"); // Redirect to home route
    } catch (error: any) {
      let errorMessage = "Login failed";
      switch (error.code) {
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/user-not-found":
          errorMessage = "No user found with this email";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many attempts, please try again later";
          break;
        default:
          errorMessage = error.message || "An error occurred";
      }
      setServerError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem("token", token);
      navigate("/"); // Redirect to home route
    } catch (error: any) {
      let errorMessage = "Google sign-in failed";
      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Sign-in popup was closed";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-in was cancelled";
          break;
        default:
          errorMessage = error.message || "An error occurred";
      }
      setServerError(errorMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      navigate("/"); // Redirect to home route
    } catch (error: any) {
      setServerError("Sign-out failed: " + (error.message || "An error occurred"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-card p-8 rounded-xl shadow-lg space-y-6"
      >
        {isAuthenticated ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">
              You are signed in
            </h2>
            <p className="mt-2 text-sm text-purple-800">
              Ready to plan your next adventure?
            </p>
            <Button onClick={handleSignOut} className="w-full bg-purple-500 text-white hover:bg-purple-600 mt-4">
              Sign Out
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2 border-purple-300 text-purple-500 hover:bg-purple-200"
              onClick={() => navigate("/")}
            >
              Go to Home
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">
                Welcome to TravelAI
              </h2>
              <p className="mt-2 text-sm text-purple-800">
                Don't have an account?{" "}
                <Link to="/signup" className="text-purple-500 hover:text-purple-600">
                  Sign Up
                </Link>
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 mt-1"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 mt-1"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-purple-500 hover:text-purple-600">
                  Forgot Password?
                </Link>
              </div>
              {serverError && <p className="text-sm text-purple-800 text-center">{serverError}</p>}
              <Button type="submit" className="w-full bg-purple-500 text-white hover:bg-purple-600">
                Sign In
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="flex items-center justify-center border-purple-300 text-purple-500 hover:bg-purple-200" onClick={handleGoogleSignIn}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center border-purple-300 text-purple-500 hover:bg-purple-200" disabled>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2.04c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2.04 12 2.04m0-2C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm4.23 7.5h-2.06v2.06H12.1V7.5H10V9.56H7.94v2.06H10v2.06h2.06v-2.06h2.06v-2.06zm-6.17 4.12v2.06h2.06v-2.06H10.06z"
                  />
                </svg>
                Facebook
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default SignIn;