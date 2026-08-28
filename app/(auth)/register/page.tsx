"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Account created. Please sign in.");
      router.push("/agreements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-xl font-semibold">Create your client account</h1>
              <p className="text-sm text-slate-500">Review and sign agreements in one place</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            {(["name", "email", "company", "password"] as const).map((field) => (
              <div key={field}>
                <Label className="capitalize">{field}</Label>
                <Input
                  type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={field !== "company"}
                />
              </div>
            ))}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="text-teal-700 hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
