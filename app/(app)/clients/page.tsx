"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type Client = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  status: string;
  _count?: { projects: number; agreements: number };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    country: "",
    notes: "",
  });

  async function load() {
    const data = await apiFetch<Client[]>(`/api/clients?q=${encodeURIComponent(q)}`);
    setClients(data);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, [q]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/clients", { method: "POST", body: JSON.stringify(form) });
    toast.success("Client created");
    setOpen(false);
    setForm({ fullName: "", email: "", phone: "", company: "", address: "", country: "", notes: "" });
    load().catch(() => undefined);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage client records, notes and status."
        actions={<Button onClick={() => setOpen(true)}>New client</Button>}
      />
      <Input className="mb-4 max-w-sm" placeholder="Search name, email, company" value={q} onChange={(e) => setQ(e.target.value)} />
      {open ? (
        <Card className="mb-6">
          <CardBody>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createClient}>
              <div>
                <Label>Full name</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Internal notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Create a client before starting an agreement." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Projects</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-800 hover:underline" href={`/clients/${client.id}`}>
                      {client.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{client.email}</td>
                  <td className="px-4 py-3">{client.company ?? "—"}</td>
                  <td className="px-4 py-3">{client.status}</td>
                  <td className="px-4 py-3">{client._count?.projects ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
