"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);

  async function load() {
    setClient(await apiFetch(`/api/clients/${id}`));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, [id]);

  if (!client) return <p>Loading...</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(client) });
    toast.success("Client updated");
  }

  return (
    <div>
      <PageHeader title={client.fullName} description={client.email} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
              {["fullName", "email", "phone", "company", "address", "country"].map((field) => (
                <div key={field}>
                  <Label className="capitalize">{field}</Label>
                  <Input value={client[field] ?? ""} onChange={(e) => setClient({ ...client, [field]: e.target.value })} />
                </div>
              ))}
              <div>
                <Label>Status</Label>
                <Select value={client.status} onChange={(e) => setClient({ ...client, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Internal notes</Label>
                <Textarea value={client.notes ?? ""} onChange={(e) => setClient({ ...client, notes: e.target.value })} />
              </div>
              <Button>Save changes</Button>
            </form>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold">Projects</h3>
              <div className="mt-3 space-y-2 text-sm">
                {client.projects?.map((project: any) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block text-teal-800 hover:underline">
                    {project.name}
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold">Agreements</h3>
              <div className="mt-3 space-y-2 text-sm">
                {client.agreements?.map((item: any) => (
                  <Link key={item.id} href={`/agreements/${item.id}`} className="flex items-center justify-between">
                    {item.number} <StatusBadge status={item.status} />
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
