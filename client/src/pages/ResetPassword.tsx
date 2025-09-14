import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset } from "firebase/auth";
import { toast } from "@/components/ui/sonner";

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    // Redirect to home if already authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { password: "", confirmPassword: "" };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!token) {
      setServerError("Invalid or missing reset token");
      toast.error("Invalid or missing reset token");
      return;
    }

    try {
      await confirmPasswordReset(auth, token, formData.password);
      setSuccess("Password reset successfully. Redirecting to sign-in...");
      toast.success("Password reset successfully!", {
        description: "You can now sign in with your new password.",
      });
      setFormData({ password: "", confirmPassword: "" });
      setTimeout(() => navigate("/signin"), 3000); // Redirect after 3s
    } catch (error: any) {
      let errorMessage = "Failed to reset password";
      switch (error.code) {
        case "auth/invalid-action-code":
          errorMessage = "Invalid or expired reset link";
          break;
        case "auth/expired-action-code":
          errorMessage = "Reset link has expired";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many attempts, please try again later";
          break;
        default:
          errorMessage = error.message || "An error occurred";
      }
      setServerError(errorMessage);
      toast.error(errorMessage);
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
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-purple-800">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
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
          {success && <p className="text-sm text-purple-800 text-center">{success}</p>}
          <Button type="submit" className="w-full bg-purple-500 text-white hover:bg-purple-600">
            Reset Password
          </Button>
        </form>

        <p className="text-center text-sm text-purple-800">
          Back to{" "}
          <Link to="/signin" className="text-purple-500 hover:text-purple-600">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;