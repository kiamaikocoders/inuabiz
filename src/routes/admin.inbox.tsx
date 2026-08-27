import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Inbox, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  contactTopicLabel,
  countNewContactMessages,
  listContactMessages,
  updateContactStatus,
  type ContactMessage,
  type ContactStatus,
} from "@/lib/inbox";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/admin/inbox")({
  head: () => ({
    meta: [
      { title: "Contact inbox — InuaBiz super admin" },
      {
        name: "description",
        content: "Website contact form messages. Each submission emails ops and is stored here.",
      },
    ],
  }),
  component: AdminInbox,
});

const FILTERS: Array<{ id: ContactStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "archived", label: "Archived" },
];

function AdminInbox() {
  const live = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ContactStatus | "all">("all");
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-contact-messages", filter],
    queryFn: () => listContactMessages(filter),
    enabled: live,
  });
  const newCountQuery = useQuery({
    queryKey: ["admin-contact-new-count"],
    queryFn: countNewContactMessages,
    enabled: live,
  });

  const items = listQuery.data ?? [];
  const selectedLive = useMemo(
    () => (selected ? (items.find((i) => i.id === selected.id) ?? selected) : null),
    [items, selected],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      updateContactStatus(id, status),
    onSuccess: (_d, vars) => {
      toast.success(`Marked ${vars.status}`);
      void queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-contact-new-count"] });
      setSelected((prev) => (prev && prev.id === vars.id ? { ...prev, status: vars.status } : prev));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const newCount = newCountQuery.data ?? 0;

  return (
    <AdminShell
      title="Contact inbox"
      description="Messages from /contact. Each one emails the ops inbox and SUPER_ADMIN accounts."
    >
      {!live && (
        <p className="text-muted-foreground mb-4 text-sm">Connect Supabase to load live messages.</p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="New" value={String(newCount)} hint="Awaiting a reply" icon={Inbox} />
        <StatCard
          label="In this filter"
          value={String(items.length)}
          hint={filter === "all" ? "All messages" : filter}
          icon={Mail}
          tone="gold"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-6 py-12 text-center text-sm">
            No contact messages yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className="hidden md:table-cell">Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-muted-foreground text-xs">{row.email || row.phone || "—"}</div>
                  </TableCell>
                  <TableCell>{contactTopicLabel(row.topic)}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm md:table-cell">
                    {row.message}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "new" ? "default" : "secondary"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                    {formatWhen(row.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(selectedLive)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLive?.name}</DialogTitle>
          </DialogHeader>
          {selectedLive && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Topic · </span>
                {contactTopicLabel(selectedLive.topic)}
              </p>
              <p className="flex flex-wrap items-center gap-3">
                {selectedLive.email && (
                  <a
                    className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                    href={`mailto:${selectedLive.email}`}
                  >
                    <Mail className="size-3.5" />
                    {selectedLive.email}
                  </a>
                )}
                {selectedLive.phone && (
                  <a
                    className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                    href={`tel:${selectedLive.phone}`}
                  >
                    <Phone className="size-3.5" />
                    {selectedLive.phone}
                  </a>
                )}
              </p>
              <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 leading-relaxed">
                {selectedLive.message}
              </p>
              <p className="text-muted-foreground text-xs">{formatWhen(selectedLive.created_at)}</p>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selectedLive?.status !== "read" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() =>
                  selectedLive && statusMutation.mutate({ id: selectedLive.id, status: "read" })
                }
              >
                Mark read
              </Button>
            )}
            {selectedLive?.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() =>
                  selectedLive && statusMutation.mutate({ id: selectedLive.id, status: "archived" })
                }
              >
                Archive
              </Button>
            )}
            {selectedLive?.status === "archived" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() =>
                  selectedLive && statusMutation.mutate({ id: selectedLive.id, status: "new" })
                }
              >
                Restore
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function formatWhen(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm");
  } catch {
    return iso;
  }
}
