import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { broadcasts } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/broadcasts")({
  head: () => ({
    meta: [
      { title: "Broadcasts — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Send system-wide banner messages to all vendors or a targeted segment, and review broadcast history.",
      },
      { property: "og:title", content: "InuaBiz broadcasts" },
      { property: "og:description", content: "System-wide messaging to every tenant." },
    ],
  }),
  component: Broadcasts,
});

function Broadcasts() {
  const [message, setMessage] = useState("");

  return (
    <AdminShell title="Broadcasts" description="System-wide messages to your tenants">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="surface-card p-5">
          <h2 className="inline-flex items-center gap-2 font-semibold">
            <Megaphone className="text-primary size-4" /> New broadcast
          </h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aud">Audience</Label>
              <Select defaultValue="all">
                <SelectTrigger id="aud">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  <SelectItem value="active">Active subscribers</SelectItem>
                  <SelectItem value="trial">Trial vendors</SelectItem>
                  <SelectItem value="lapsed">Lapsed / suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch">Channels</Label>
              <Select defaultValue="banner">
                <SelectTrigger id="ch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">In-app banner only</SelectItem>
                  <SelectItem value="banner_email">Banner + email</SelectItem>
                  <SelectItem value="all">Banner + email + SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Message</Label>
              <Textarea
                id="msg"
                rows={4}
                placeholder="Scheduled maintenance on Sunday 02:00 – 03:00 EAT."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success("Broadcast queued", {
                  description: "It will appear as a banner for the selected audience.",
                });
                setMessage("");
              }}
            >
              <Send className="mr-2 size-4" /> Send broadcast
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Live preview
            </p>
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/15 p-4">
              <p className="text-sm font-medium">
                {message || "Scheduled maintenance on Sunday 02:00 – 03:00 EAT."}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Shown at the top of every vendor screen until dismissed.
              </p>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-semibold">History</h2>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-xs truncate font-medium">{b.message}</TableCell>
                      <TableCell className="text-muted-foreground">{b.audience}</TableCell>
                      <TableCell className="text-muted-foreground">{b.sent}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === "Sent" ? "secondary" : "outline"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
