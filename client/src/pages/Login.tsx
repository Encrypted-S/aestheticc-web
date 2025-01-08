import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleLogin } from "../lib/auth";
import { useLocation } from "wouter";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { startGoogleLogin } = useGoogleLogin();
  const [location] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const params = new URLSearchParams(location.split("?")[1]);
  const error = params.get("error");
  const verified = params.get("verified");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const endpoint = isRegistering ? "/api/register" : "/api/login";
      const body = isRegistering ? { email, password, name } : { email, password };

      console.log("Submitting auth request to:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Auth error:', { 
          status: response.status, 
          data 
        });
        throw new Error(data.error || "Authentication failed");
      }

      if (isRegistering) {
        setErrorMessage("Account created successfully! You can now log in.");
        setIsRegistering(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Auth error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground">
            {isRegistering
              ? "Sign up to start managing your content"
              : "Sign in to access your content dashboard"}
          </p>
        </div>

        {verified && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Email verified successfully! You can now log in.
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {isRegistering ? "Create Account" : "Sign in"}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-primary hover:underline"
            >
              {isRegistering
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            onClick={startGoogleLogin}
            variant="outline"
            className="w-full py-6"
          >
            <div className="inline-flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                />
              </svg>
              Continue with Google
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}