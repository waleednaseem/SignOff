"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    apiFetch("/api/profile").then(setProfile).catch((err) => toast.error(err.message));
  }, []);
  if (!profile) return <p>Loading...</p>;
  return (
    <div>
      <PageHeader title="Profile" />
      <Card>
        <CardBody className="max-w-xl space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile.email ?? ""} disabled />
          </div>
          {profile.client ? (
            <>
              <div>
                <Label>Phone</Label>
                <Input
                  value={profile.client.phone ?? ""}
                  onChange={(e) => setProfile({ ...profile, client: { ...profile.client, phone: e.target.value } })}
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={profile.client.company ?? ""}
                  onChange={(e) => setProfile({ ...profile, client: { ...profile.client, company: e.target.value } })}
                />
              </div>
            </>
          ) : null}
          <Button onClick={async () => {
            await apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify(profile) });
            toast.success("Profile updated");
          }}>Save</Button>
        </CardBody>
      </Card>
    </div>
  );
}
