# The stack - Why?

### Backend

NestJS (Backend)

- I like how opinionated it is - it forces you into a clean, modular structure, which many pure express apps lack. Under the hood it’s still just Express, so it’s easy to jump in and tweak stuff when you need to. It also seems to be quite popular in enterprise, has been battle tested with more than a decade of use, and has a great evosystem around it.

- One of the big wins of a TypeScript monorepo is end to end type safety between frontend and backend via shared types. I used to stitch together a few tools to get close to this (nestjs-zod, OpenAPI generation, Orval client, etc) and honestly it started to feel like tRPC with extra steps. tRPC in nest is not traditional, but I've tapped into the express primitives to make it work in a way where you can still inject nestjs services into it, and it makes for quite a beautiful type safe dev experience. Very happy so far.
  -  _Also, why not just go “pure tRPC” and skip Nest?_ Mostly because I like how Nest forces structure. The module + DI stuff makes it way easier to keep things clean as the app grows (proper S3/email/billing services etc), and I can inject all of that into my tRPC context anyway. Then I use Nest’s normal module/controller setup for public REST endpoints (webhooks, auth callbacks, external integrations), while tRPC is mainly for frontend app calls. Best of both worlds IMO.

Drizzle (ORM)

- These guys have the best sense of humour in tech. Their branding and X account are crackup.
- The ORM itself is lightweight, reads a lot like SQL, but still type-safe. That’s the sweet spot for me.

Postgres (Datbaase)

- Extremely powerful, loads of extensions (PGVector being a big one).
- Also I like using Supabase. This choice feels pretty standard these days, but for good reason.

Better Auth (Auth)

- This is a new addition to my stack. I prefer having control of auth rather than getting vendor locked-in, but I also don’t want to roll my own shaky JWT logic.
- A package like Better Auth feels more secure than DIY auth, plus it has heaps of pre-built plugins (OAuth etc) and it’s open source!!

### Frontend

Tanstack Router

- Call me old school but I like my backend seperate to my frontend. For the type of apps I build (SaaS) these are best suited for CSR (client side rendering). There is the option of react router, but Tanstack Router allows me to use folder based folder structure (similar to the likes of Next.JS) all while EVERYTHING being type-safe.

Tanstack Query

- Nothing much to say here. For data fetching in react there's no other correct answer.

Shadcn

- The big reason shadcn blew up is that the code lives in your repo, not hidden behind some opaque package.
- I can jump in and change a component when I need to, but otherwise it lets me move fast.
- Yea, a lot of shadcn apps end up looking the same… but that’s more of a skill issue than anything. The theme + code is customisable, so you can still build interesting UI off the same primitives.
