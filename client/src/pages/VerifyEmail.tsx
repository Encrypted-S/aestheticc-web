import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      setVerificationStatus("error");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(response => {
        if (response.ok) {
          setVerificationStatus("success");
          // Redirect to dashboard after 3 seconds on success
          setTimeout(() => {
            setLocation("/dashboard");
          }, 3000);
        } else {
          setVerificationStatus("error");
        }
      })
      .catch(() => {
        setVerificationStatus("error");
      });
  }, [token, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        {verificationStatus === "loading" && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Verifying Your Email</h2>
            <p className="text-muted-foreground">Please wait while we verify your email address...</p>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-4">
              Your email has been successfully verified. You'll be redirected to the dashboard shortly.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Verification Failed</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't verify your email address. The link may have expired or is invalid.
            </p>
            <Button onClick={() => setLocation("/login")}>
              Back to Login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
