/**
 * Write SQL to upsert the 17 Figma email templates.
 * Run: bun run src/lib/email/write-seed-sql.ts
 */
import { writeFileSync } from "node:fs";
import { buildCommunicationTemplates } from "./templates";

const templates = buildCommunicationTemplates("{{ .SiteURL }}");

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const batches = [
  templates.slice(0, 9),
  templates.slice(9),
];

batches.forEach((batch, i) => {
  const rows = batch
    .map((t) => {
      const html = `$html$${t.html}$html$`;
      return `(${sqlLiteral(t.id)}, ${sqlLiteral(t.category)}, ${sqlLiteral(t.name)}, ${sqlLiteral(t.subject)}, ${html}, ${sqlLiteral(t.description)})`;
    })
    .join(",\n");
  const sql = `insert into public.communication_templates (id, category, name, subject, html, description)
values
${rows}
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
`;
  const path = new URL(`../../../supabase/seed_communication_templates_${i + 1}.sql`, import.meta.url);
  writeFileSync(path, sql);
  console.log(`batch ${i + 1}: ${batch.length} templates, ${sql.length} bytes`);
});
