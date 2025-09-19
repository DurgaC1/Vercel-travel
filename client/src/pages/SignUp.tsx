import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Phone, Lock, User } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { toast } from "@/components/ui/sonner";

interface SignUpResponse {
  success: boolean;
  token?: string;
  message?: string;
}

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false); // New flag to prevent redirect during signup
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home only if not in signup process
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !isSigningUp) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate, isSigningUp]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    };

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      isValid = false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }
    if (!formData.mobile.match(/^\+\d{10,15}$/)) {
      newErrors.mobile = "Please enter a valid mobile number (e.g., +1234567890)";
      isValid = false;
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    });
    setServerError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSigningUp(true); // Set flag to prevent redirect
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });
      const token = await user.getIdToken(true); // Force refresh token
      localStorage.setItem("token", token);
      console.log('Firebase ID Token:', token);

      // Send profile to backend
      const profile = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        createdAt: new Date().toISOString(),
      };
      console.log('Sending profile to backend:', profile);
      const response = await fetch("http://localhost:3002/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error:', response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
      }
      const responseData = await response.json();
      console.log('Backend response:', responseData);
      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to create profile");
      }

      toast.success("Account created successfully! Welcome to Travel Genie.");
      resetForm();
      setIsSigningUp(false); // Reset flag
      navigate("/"); // Navigate to dashboard
    } catch (error: any) {
      console.error("Sign-up error:", error.message, error);
      let errorMessage = "Signup failed: " + error.message;
      switch (error.code || error.message) {
        case "auth/email-already-in-use":
          errorMessage = "Email is already registered";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email format";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled";
          break;
        default:
          errorMessage = error.message || "An error occurred";
      }
      setServerError(errorMessage);
      toast.error(errorMessage);
      setIsSigningUp(false); // Reset flag on error
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSigningUp(true); // Set flag to prevent redirect
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken(true); // Force refresh token
      localStorage.setItem("token", token);
      console.log('Firebase ID Token:', token);

      // Send minimal profile to backend
      const profile = {
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
        mobile: "",
        createdAt: new Date().toISOString(),
      };
      console.log('Sending Google profile to backend:', profile);
      const response = await fetch("http://localhost:3002/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error:', response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
      }
      const responseData = await response.json();
      console.log('Backend response:', responseData);
      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to create profile");
      }

      toast.success("Account created successfully! Welcome to Travel Genie.");
      resetForm();
      setIsSigningUp(false); // Reset flag
      navigate("/"); // Navigate to dashboard
    } catch (error: any) {
      console.error("Google sign-up error:", error.message, error);
      let errorMessage = "Google sign-up failed: " + error.message;
      switch (error.code || error.message) {
        case "auth/popup-closed-by-user":
          errorMessage = "Sign-up popup was closed";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-up was cancelled";
          break;
        default:
          errorMessage = error.message || "An error occurred";
      }
      setServerError(errorMessage);
      toast.error(errorMessage);
      setIsSigningUp(false); // Reset flag on error
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full bg-card p-8 rounded-xl shadow-lg space-y-6"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">
            Join Travel Genie
          </h2>
          <p className="mt-2 text-sm text-purple-800">
            Already have an account?{" "}
            <Link to="/signin" className="text-purple-500 hover:text-purple-600">
              Sign In
            </Link>
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="pl-10 mt-1"
                  placeholder="John"
                />
              </div>
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="pl-10 mt-1"
                  placeholder="Doe"
                />
              </div>
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
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
            <Label htmlFor="mobile">Mobile</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                value={formData.mobile}
                onChange={handleInputChange}
                className="pl-10 mt-1"
                placeholder="+1234567890"
              />
            </div>
            {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
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
                {showPassword ? <EyeOff className="w-4 h-4 text-purple-500" /> : <Eye className="w-4 h-4 text-purple-500" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="pl-10 pr-10 mt-1"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 text-purple-500" /> : <Eye className="w-4 h-4 text-purple-500" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>
          {serverError && <p className="text-sm text-purple-800 text-center">{serverError}</p>}
          <Button type="submit" className="w-full bg-purple-500 text-white hover:bg-purple-600">
            Sign Up
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
          <Button variant="outline" className="flex items-center justify-center border-purple-300 text-purple-500 hover:bg-purple-200" onClick={handleGoogleSignUp}>
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
      </motion.div>
    </div>
  );
};

export default SignUp;