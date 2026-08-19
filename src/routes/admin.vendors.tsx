import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CircleCheck,
  CircleSlash,
  Eye,
  Hourglass,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, tenants as mockTenants } from "@/lib/mock-data";
import { fetchTenants, startImpersonation } from "@/lib/data";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Every onboarded tenant with status, category, location, MRR and one-click impersonation for live support.",
      },
      { property: "og:title", content: "InuaBiz vendor directory" },
      { property: "og:description", content: "Manage every tenant with one-click impersonation." },
    ],
  }),
  component: Vendors,
});

function Vendors() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const { data: tenants = mockTenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });

  const rows = tenants.filter(
    (t) =>
      (tab === "all" || t.status.toLowerCase() === tab) &&
      (t.business.toLowerCase().includes(q.toLowerCase()) ||
        t.owner.toLowerCase().includes(q.toLowerCase()) ||
        t.town.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AdminShell
      title="Vendors"
      description="All onboarded tenants across the platform"
      actions={
        <Button
          size="sm"
          variant="ink"
          className="hidden rounded-[10px] sm:inline-flex"
          onClick={() =>
            toast.message("Invite vendor", {
              description: "Self-serve onboarding is already live. Share the signup link.",
            })
          }
        >
          <Plus className="size-3.5" /> Invite vendor
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tenants"
          value={String(tenants.length)}
          icon={Store}
          delta={12}
          tone="violet"
        />
        <StatCard
          label="Active"
          value={String(tenants.filter((t) => t.status === "Active").length)}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="On trial"
          value={String(tenants.filter((t) => t.status === "Trial").length)}
          icon={Hourglass}
          tone="gold"
        />
        <StatCard
          label="Needs attention"
          value={String(
            tenants.filter((t) => t.status === "Error" || t.status === "Suspended").length,
          )}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="trial">Trial</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search business, owner, town…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Town</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/admin/tenants/$tenantId"
                      params={{ tenantId: t.id }}
                      className="hover:underline"
                    >
                      {t.business}
                    </Link>
                  </TableCell>
                  <TableCell>{t.owner}</TableCell>
                  <TableCell className="text-muted-foreground">{t.phone}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-muted-foreground">{t.town}</TableCell>
                  <TableCell className="text-muted-foreground">{t.joined}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {t.mrr ? KES(t.mrr) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={t.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void startImpersonation(t).then(() => {
                          toast.success("Ghost session started", { description: t.business });
                          void navigate({ to: "/app" });
                        });
                      }}
                    >
                      <Eye className="mr-1.5 size-4" /> Impersonate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <StatusEmpty
                      icon={CircleSlash}
                      title="No results match"
                      description="Try a different search, or clear filters and browse the vendor directory."
                      primary={{
                        label: "Clear filters",
                        onClick: () => {
                          setQ("");
                          setTab("all");
                        },
                      }}
                      secondary={{ label: "GIS store map", to: "/admin/map" }}
                      meta="0 results"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
