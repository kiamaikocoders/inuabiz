import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — InuaBiz" },
      {
        name: "description",
        content:
          "Manage your business profile, M-Pesa payment channels, staff access and receipt preferences.",
      },
      { property: "og:title", content: "InuaBiz settings" },
      { property: "og:description", content: "Business profile, payment channels and staff access." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const save = () => toast.success("Settings saved", { description: "Front-end demo only for now." });

  return (
    <AppShell title="Settings" description="Business profile, payments and staff">
      <Tabs defaultValue="business" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <div className="surface-card space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bn">Business name</Label>
                <Input id="bn" defaultValue="Njoroge Mini Mart" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Category</Label>
                <Select defaultValue="duka">
                  <SelectTrigger id="cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duka">Duka</SelectItem>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="chemist">Chemist</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="eatery">Eatery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph">Owner phone</Label>
                <Input id="ph" defaultValue="0722 431 002" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">Email (for receipts)</Label>
                <Input id="em" type="email" defaultValue="njoroge@example.com" />
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Store location</Label>
                <p className="text-muted-foreground text-sm">
                  Pinned at -1.2864, 36.8172 · Kasarani
                </p>
              </div>
              <Button variant="outline" onClick={() => toast.success("Location updated")}>
                <MapPin className="mr-2 size-4" /> Re-detect
              </Button>
            </div>
            <Button onClick={save}>
              <Save className="mr-2 size-4" /> Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="surface-card space-y-5 p-6">
            <div>
              <h2 className="font-semibold">Payment destinations</h2>
              <p className="text-muted-foreground text-sm">
                Money from sales lands in these channels. All of them reconcile automatically.
              </p>
            </div>
            {[
              { label: "Personal M-Pesa", value: "0722 431 002", active: true },
              { label: "Buy Goods Till", value: "889 201", active: true },
              { label: "Paybill", value: "Not configured", active: false },
              { label: "Pochi la Biashara", value: "Not configured", active: false },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-muted-foreground text-sm">{c.value}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={c.active ? "secondary" : "outline"}>
                    {c.active ? "Active" : "Off"}
                  </Badge>
                  <Switch defaultChecked={c.active} />
                </div>
              </div>
            ))}
            <Button onClick={save}>
              <Save className="mr-2 size-4" /> Save payment settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <div className="surface-card space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Staff access</h2>
              <p className="text-muted-foreground text-sm">
                Attendants can sell but cannot see margins, insights or settings.
              </p>
            </div>
            {[
              { name: "Mama Njoroge", role: "Owner", phone: "0722 431 002" },
              { name: "Kevin M.", role: "Attendant", phone: "0711 220 118" },
              { name: "Faith A.", role: "Attendant", phone: "0745 991 002" },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-muted-foreground text-sm">{s.phone}</p>
                </div>
                <Badge variant={s.role === "Owner" ? "default" : "outline"}>{s.role}</Badge>
              </div>
            ))}
            <Button variant="outline" onClick={() => toast.info("Invite staff by phone number")}>
              Invite an attendant
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <div className="surface-card space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="rf">Receipt footer message</Label>
              <Input id="rf" defaultValue="Asante sana! Karibu tena." />
            </div>
            {[
              ["Send SMS receipt", "Costs are covered by your subscription", true],
              ["Send email receipt", "When the customer has an email on file", false],
              ["Show margins on receipt", "Never share this with customers", false],
            ].map(([l, h, on]) => (
              <div key={l as string} className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm">{l as string}</Label>
                  <p className="text-muted-foreground text-xs">{h as string}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
            <Button onClick={save}>
              <Save className="mr-2 size-4" /> Save receipt settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
