"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@signoff.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const fallback = session?.user?.role === "CLIENT" ? "/agreements" : "/dashboard";
    const next = params.get("callbackUrl");
    router.push(next && next !== "/dashboard" ? next : fallback);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Signoff</h1>
              <p className="text-sm text-slate-500">Project agreements</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500">
            Need an account?{" "}
            <Link href="/register" className="text-teal-700 hover:underline">
              Create a client account
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
