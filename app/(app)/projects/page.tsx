"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { ProjectBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    description: "",
    status: "PLANNING",
    startDate: "",
    expectedCompletion: "",
    internalNotes: "",
  });

  async function load() {
    const data = await apiFetch<any[]>(`/api/projects?q=${encodeURIComponent(q)}&status=${status}`);
    setProjects(data);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, [q, status]);

  useEffect(() => {
    if (isAdmin) apiFetch<any[]>("/api/clients").then(setClients).catch(() => undefined);
  }, [isAdmin]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(form) });
    toast.success("Project created");
    setOpen(false);
    load().catch(() => undefined);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Each client can have multiple projects."
        actions={isAdmin ? <Button onClick={() => setOpen(true)}>New project</Button> : null}
      />
      <div className="mb-4 flex gap-3">
        <Input placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-48">
          <option value="ALL">All statuses</option>
          {["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((item) => (
            <option key={item} value={item}>
              {item.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      {open ? (
        <Card className="mb-6">
          <CardBody>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createProject}>
              <div>
                <Label>Client</Label>
                <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>Expected completion</Label>
                <Input type="date" value={form.expectedCompletion} onChange={(e) => setForm({ ...form, expectedCompletion: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Internal notes</Label>
                <Textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
              </div>
              <Button>Save</Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
      {projects.length === 0 ? (
        <EmptyState title="No projects" description="Create a project to attach agreements." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:border-teal-200">
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-slate-500">{project.client?.fullName}</p>
                    </div>
                    <ProjectBadge status={project.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{project.description}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
