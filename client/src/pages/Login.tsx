import { Button } from "@/components/ui/button";
import { useGoogleLogin } from "../lib/auth";
import { useLocation } from "wouter";

export default function Login() {
  const { startGoogleLogin, isLoading } = useGoogleLogin();
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const error = params.get("error");

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access your content dashboard
          </p>
        </div>

        {error === "auth_failed" && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
            Authentication failed. Please try again.
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={startGoogleLogin}
            variant="outline"
            className="w-full py-6"
            disabled={isLoading}
          >
            <div className="inline-flex items-center">
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    fill="none" 
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                  />
                </svg>
              ) : (
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
              )}
              Continue with Google
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
