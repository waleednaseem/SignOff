"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("custom");
  const [description, setDescription] = useState("");

  async function load() {
    setTemplates(await apiFetch("/api/templates"));
  }
  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Templates" description="Reuse scope, pricing and terms when creating agreements." />
      <Card className="mb-6">
        <CardBody className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={async () => {
            await apiFetch("/api/templates", { method: "POST", body: JSON.stringify({ name, type, description }) });
            toast.success("Template created");
            load().catch(() => undefined);
          }}>Create template</Button>
        </CardBody>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardBody>
              <h3 className="font-semibold">{template.name}</h3>
              <p className="text-sm text-slate-500">{template.description}</p>
              <p className="mt-2 text-xs uppercase text-slate-400">{template.type}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  await apiFetch("/api/templates", { method: "PATCH", body: JSON.stringify({ id: template.id, duplicate: true }) });
                  toast.success("Duplicated");
                  load().catch(() => undefined);
                }}>Duplicate</Button>
                <Button size="sm" variant="danger" onClick={async () => {
                  await apiFetch("/api/templates", { method: "DELETE", body: JSON.stringify({ id: template.id }) });
                  toast.success("Deleted");
                  load().catch(() => undefined);
                }}>Delete</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
