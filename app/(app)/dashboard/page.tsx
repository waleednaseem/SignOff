"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, Skeleton } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type AdminDash = {
  totalClients: number;
  activeProjects: number;
  draftAgreements: number;
  awaitingClient: number;
  awaitingSignature: number;
  signedAgreements: number;
  expiringAgreements: number;
  openChangeRequests: number;
  activity: Array<{ id: string; eventType: string; createdAt: string; agreement?: { number: string } | null }>;
};

type ClientDash = {
  activeProjects: number;
  pendingAgreements: number;
  awaitingSignature: number;
  signedAgreements: number;
  changeRequests: number;
  activity: Array<{ id: string; eventType: string; createdAt: string; agreement?: { number: string } | null }>;
};

export default function DashboardPage() {
  const { data } = useSession();
  const [stats, setStats] = useState<AdminDash | ClientDash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<AdminDash | ClientDash>("/api/dashboard")
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const admin = data?.user?.role === "ADMIN";
  const cards = admin
    ? [
        ["Total clients", (stats as AdminDash).totalClients],
        ["Active projects", (stats as AdminDash).activeProjects],
        ["Draft agreements", (stats as AdminDash).draftAgreements],
        ["Awaiting client", (stats as AdminDash).awaitingClient],
        ["Awaiting signature", (stats as AdminDash).awaitingSignature],
        ["Signed", (stats as AdminDash).signedAgreements],
        ["Expiring", (stats as AdminDash).expiringAgreements],
        ["Open change requests", (stats as AdminDash).openChangeRequests],
      ]
    : [
        ["Active projects", (stats as ClientDash).activeProjects],
        ["Pending agreements", (stats as ClientDash).pendingAgreements],
        ["Pending signature", (stats as ClientDash).awaitingSignature],
        ["Signed", (stats as ClientDash).signedAgreements],
        ["Change requests", (stats as ClientDash).changeRequests],
      ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={admin ? "Pipeline across clients, projects and agreements." : "Your projects and agreements at a glance."}
        actions={
          admin ? (
            <Link href="/agreements/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
              New agreement
            </Link>
          ) : null
        }
      />
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={String(label)}>
            <CardBody>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value as number}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 font-semibold">Recent activity</h2>
          <div className="space-y-3">
            {stats.activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              stats.activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.eventType.replaceAll("_", " ")}
                    {item.agreement ? ` · ${item.agreement.number}` : ""}
                  </span>
                  <span className="text-slate-400">{formatDateTime(item.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
