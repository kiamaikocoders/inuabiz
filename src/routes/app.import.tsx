import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/csv";
import {
  backfillTemplate,
  previewBackfill,
  runBackfillImport,
  type ImportKind,
  type ImportPreview,
  type ImportResult,
} from "@/lib/import-backfill";
import { isVendorOwner, useIdentity } from "@/lib/identity";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/import")({
  head: () => ({
    meta: [
      { title: "Import books — InuaBiz" },
      {
        name: "description",
        content: "Backfill products, customers and past sales from before you joined InuaBiz.",
      },
    ],
  }),
  component: ImportPage,
});

const KIND_COPY: Record<
  ImportKind,
  { title: string; blurb: string; tip: string }
> = {
  products: {
    title: "Products & stock",
    blurb: "Bring in your catalogue. Stock column is what you have on the shelf today.",
    tip: "Import products first if you also plan to import past sales.",
  },
  customers: {
    title: "Customers & credit",
    blurb: "Names, phones, and opening balances they still owe you from before InuaBiz.",
    tip: "Opening balance creates a credit charge — not a fake sale.",
  },
  sales: {
    title: "Past sales",
    blurb: "Till-book rows from before InuaBiz. One row per line item; match products by SKU or name.",
    tip: "Does not change stock (stock came from the products file). No ETR invoice is issued for imported history.",
  },
};

function ImportPage() {
  const identity = useIdentity("vendor");
  const owner = isVendorOwner(identity.role);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ImportKind>("products");
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = KIND_COPY[kind];

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    setFileName(file.name);
    setResult(null);
    setPreview(previewBackfill(kind, text));
  };

  const onKindChange = (next: string) => {
    const k = next as ImportKind;
    setKind(k);
    setResult(null);
    if (raw) setPreview(previewBackfill(k, raw));
    else setPreview(null);
  };

  const downloadTemplate = () => {
    downloadCsv(`inuabiz-${kind}-template.csv`, backfillTemplate(kind));
    toast.success("Template downloaded");
  };

  const runImport = async () => {
    if (!owner) {
      toast.error("Owner only", { description: "Ask the shop owner to run the import." });
      return;
    }
    if (!raw.trim()) {
      toast.error("Choose a CSV file first");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error("Sign in to import");
      return;
    }
    setBusy(true);
    try {
      const out = await runBackfillImport(kind, raw);
      setResult(out);
      if (out.imported > 0) {
        toast.success(`Imported ${out.imported} ${kind}`, {
          description: out.errors.length ? `${out.errors.length} rows need a fix` : "Looking good",
        });
        void queryClient.invalidateQueries({ queryKey: ["products"] });
        void queryClient.invalidateQueries({ queryKey: ["customers"] });
        void queryClient.invalidateQueries({ queryKey: ["shop-customers"] });
        void queryClient.invalidateQueries({ queryKey: ["sales"] });
        void queryClient.invalidateQueries({ queryKey: ["credit-book"] });
      } else {
        toast.error("Nothing imported", {
          description: out.errors[0]?.message ?? "Check the CSV columns against the template.",
        });
      }
    } catch (err) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const canRun = useMemo(
    () => Boolean(raw.trim()) && (preview?.ready ?? 0) > 0 && !busy && owner,
    [raw, preview, busy, owner],
  );

  return (
    <AppShell
      title="Import books"
      description="Backfill data from before InuaBiz"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/settings">Settings</Link>
        </Button>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Bring your old books into InuaBiz</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Download a template, fill it from your notebook or spreadsheet, then upload. Best order:
            products → customers → past sales. Active subscription required (locked shops cannot
            import).
          </p>
          {!owner && (
            <p className="text-amber-700 dark:text-amber-400 mt-3 text-xs font-medium">
              Only the shop owner can run imports.
            </p>
          )}
        </div>

        <Tabs value={kind} onValueChange={onKindChange}>
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              Products
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">
              Customers
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm">
              Past sales
            </TabsTrigger>
          </TabsList>

          {(["products", "customers", "sales"] as ImportKind[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{KIND_COPY[k].title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {KIND_COPY[k].blurb}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      {KIND_COPY[k].tip}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
                    <Download className="mr-1.5 size-3.5" />
                    Template
                  </Button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => fileRef.current?.click()}
                    disabled={!owner}
                  >
                    <Upload className="mr-2 size-4" />
                    {fileName && kind === k ? fileName : "Choose CSV file"}
                  </Button>
                  <Button type="button" disabled={!canRun || kind !== k} onClick={() => void runImport()}>
                    {busy && kind === k ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 size-4" />
                    )}
                    Import {k}
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {preview && preview.kind === kind && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Preview</p>
              <Badge variant="secondary">{preview.ready} ready</Badge>
              {preview.errors.length > 0 && (
                <Badge variant="destructive">{preview.errors.length} issues</Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {preview.totalRows} data row{preview.totalRows === 1 ? "" : "s"} in file
              </span>
            </div>

            {preview.sample.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      {Object.keys(preview.sample[0]!).map((h) => (
                        <th key={h} className="px-2 py-1.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/60">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5">
                            {v || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.errors.length > 0 && (
              <ul className="text-destructive mt-3 space-y-1 text-xs">
                {preview.errors.slice(0, 8).map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && result.kind === kind && (
          <div
            className={cn(
              "rounded-xl border p-4 sm:p-5",
              result.imported > 0
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <p className="text-sm font-semibold">
              Done — {result.imported} imported
              {result.skipped ? `, ${result.skipped} skipped` : ""}
            </p>
            {result.errors.length > 0 && (
              <ul className="text-muted-foreground mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {result.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {kind === "products" && (
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/app/inventory">Open inventory</Link>
                </Button>
              )}
              {kind === "customers" && (
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/app/customers">Open customers</Link>
                </Button>
              )}
              {kind === "sales" && (
                <Button size="sm" variant="secondary" asChild>
                  <Link to="/app/sales">Open sales</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
