import { useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setMessage("");
    setPending(true);
    const result = mode === "sign-in"
      ? await signIn(email, password)
      : await signUp(email, password);
    setPending(false);

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "sign-up") {
      setMessage("Account created. Check your email if confirmation is enabled.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-primary/20 bg-card/90 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl shadow-lg shadow-primary/20">
            <img src="/logo.svg?v=2" alt="RecruitIntel logo" className="h-full w-full" />
          </div>
          <div>
            <CardTitle className="text-2xl">{mode === "sign-in" ? "Welcome back" : "Create your workspace"}</CardTitle>
            <CardDescription className="mt-2">
              Your resumes, jobs, and reports stay private to your account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button className="w-full gap-2" onClick={() => void submit()} disabled={!email || password.length < 6 || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "sign-in" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
          <button className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>
            {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
