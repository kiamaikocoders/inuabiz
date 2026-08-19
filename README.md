# InuaBiz

Multi-tenant micro-POS for Kenyan MSMEs.

| Layer | Source |
|-------|--------|
| **Frontend** | TanStack Start + shadcn at the repo root |
| **Backend** | Supabase schema, RLS, Edge Functions in `supabase/` |
| **Design** | [Figma InuaBiz](https://www.figma.com/design/3ZqcSeQ5GcPWgTsSlojd7o) |

```bash
bun install   # or npm install
npm run dev   # or bun run dev
```

Opens [http://localhost:8080/](http://localhost:8080/). Copy `.env.example` to `.env` if you do not already have one.

Mock data is the fallback when you are not signed in. Signed-in vendors hit Supabase tables, `generate-ai-insights`, and onboarding RPC.

- [Backend guide](docs/BACKEND.md)
- [Daraja Advanced](docs/DARAJA_ADVANCED.md)
- Project: https://hnzzkmifgufurkqvnchp.supabase.co
