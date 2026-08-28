"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { ProjectBadge, StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    apiFetch(`/api/projects/${id}`).then(setProject).catch((err) => toast.error(err.message));
  }, [id]);

  if (!project) return <p>Loading...</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(project) });
    toast.success("Project updated");
  }

  return (
    <div>
      <PageHeader title={project.name} description={project.client?.fullName} actions={<ProjectBadge status={project.status} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            {isAdmin ? (
              <form className="space-y-3" onSubmit={save}>
                <div>
                  <Label>Name</Label>
                  <Input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={project.description ?? ""} onChange={(e) => setProject({ ...project, description: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={project.status} onChange={(e) => setProject({ ...project, status: e.target.value })}>
                    {["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Internal notes</Label>
                  <Textarea value={project.internalNotes ?? ""} onChange={(e) => setProject({ ...project, internalNotes: e.target.value })} />
                </div>
                <Button>Save</Button>
              </form>
            ) : (
              <p className="text-sm text-slate-600">{project.description}</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold">Agreements</h3>
            <div className="mt-3 space-y-2">
              {project.agreements?.map((item: any) => (
                <Link key={item.id} href={`/agreements/${item.id}`} className="flex items-center justify-between text-sm">
                  {item.number} <StatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
