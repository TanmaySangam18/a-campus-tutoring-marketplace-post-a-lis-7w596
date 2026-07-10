Implement a small but REAL, working full-stack web app in this Next.js (App Router, TypeScript, Tailwind CSS) project for:

a campus tutoring marketplace: post a listing, browse tutors, book a slot — with a real backend

Requirements:
- A polished UI in app/page.tsx (a client component) with the core create/list/delete flow.
- A REAL backend API route at app/api/items/route.ts (GET + POST) — no mock data.
- Persist data. If SUPABASE_URL + SUPABASE_ANON_KEY env vars exist use Supabase; otherwise use an
  in-memory store in the route so it runs with zero config. Keep it typed and simple.
- Clean, responsive, no console errors. It must build with `next build` and run on Vercel.
- CODE MUST COMPILE: correct TypeScript types (no `any`-that-breaks), no unused imports/vars, only
  stable Next.js 16 App Router APIs. Prefer simple, standard patterns over clever ones.

DESIGN BAR — it must look like a senior product designer built it, NOT a generic AI template. Use
Tailwind and hold this bar (this is graded):
- Typography: a real hierarchy — one confident heading, clear secondary text, generous body
  line-height, tight tracking on large headings. Two weights only (normal + semibold).
- Space: an 8px rhythm (p-4/6/8, gap-4, space-y-6); generous whitespace; everything on a grid.
- Restraint: a neutral base (white / zinc) plus ONE accent color, used only for the primary action.
  No rainbow of colors, no heavy borders everywhere.
- Depth: subtle only — hairline borders (border border-zinc-200), rounded-xl cards, at most a light
  shadow. No decorative gradients, no neon, no emoji used as UI.
- Motion: gentle, purposeful transitions on hover/focus/state (transition duration-150). Never gratuitous.
- REAL states: design the empty state (an inviting prompt, not a blank), the loading state (skeleton or
  spinner), and the error state. They are part of the product, not afterthoughts.
- Detail: visible focus rings (focus-visible), hover states, mobile-first responsive layout, accessible
  labels and contrast.
- Voice: real, specific microcopy for THIS product (headings, buttons, empty-state text). Never lorem
  ipsum, never "get started by editing".
Aim for the calm, content-first polish of Linear / Stripe / Apple — clarity and restraint over decoration.