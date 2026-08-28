"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => {
    apiFetch("/api/settings").then(setSettings).catch((err) => toast.error(err.message));
  }, []);
  if (!settings) return <p>Loading...</p>;
  return (
    <div>
      <PageHeader title="Settings" description="Company defaults and reminder preferences." />
      <Card>
        <CardBody className="max-w-xl space-y-3">
          <div>
            <Label>Company name</Label>
            <Input value={settings.companyName ?? ""} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          </div>
          <div>
            <Label>Company email</Label>
            <Input value={settings.companyEmail ?? ""} onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={settings.companyAddress ?? ""} onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })} />
          </div>
          <div>
            <Label>Default currency</Label>
            <Input value={settings.defaultCurrency ?? "USD"} onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings.reminderEnabled} onChange={(e) => setSettings({ ...settings, reminderEnabled: e.target.checked })} />
            Enable expiry reminders (3 days, 1 day, on expiry)
          </label>
          <Button onClick={async () => {
            await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify(settings) });
            toast.success("Settings saved");
          }}>Save</Button>
        </CardBody>
      </Card>
    </div>
  );
}
