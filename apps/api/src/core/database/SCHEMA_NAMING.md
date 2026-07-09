# DB table naming

Tables are named so that **alphabetical sort groups related tables together**. When browsing the table list in a DB client, everything for one domain should sit in a contiguous block.

## Rule

Every table name starts with a **domain prefix**. Subtables extend the parent's prefix. The same rule applies to `pgEnum` types — enum names use the same prefix as the tables that own them so `\dT` (list types) groups cleanly too.

```
<domain>[_<subdomain>][_<entity>]
```

- Parent table = the prefix alone (e.g. `billing`, `catalog`).
- Child tables extend it (`catalog_item`, `catalog_item_variant`).
- Enum types backing a table share the table's prefix (`catalog_item_status`, …).
- The Drizzle **variable name** is independent and can stay short/camelCase (e.g. `catalogItem`, `itemStatusEnum`). This rule is only about the string passed to `pgTable(...)` / `pgEnum(...)`.

## Folder convention

Schema lives under `schema/<domain>/`:

```
schema/
  index.ts          # top-level barrel, re-exports each domain
  auth/
    index.ts        # domain barrel
    better-auth.ts  # tables
  example/
    index.ts
    book.ts
    enums.ts        # (when the domain has enums)
```

Add a new domain by creating `schema/<domain>/` with its own `index.ts` barrel and adding one line to the top-level `schema/index.ts`.

Better-auth tables (`user`, `session`, `account`, `organization`, …) are managed by the library and left **unprefixed** unless explicitly overridden in the better-auth config.

## When adding a new table or enum

1. Pick the domain it belongs to. If none fit, introduce a new prefix — don't leave the table unprefixed.
2. Name it `<prefix>_<rest>`.
3. If adding a sibling to an existing group, match the exact prefix already in use (don't invent a new one — inconsistency here is the whole problem this rule fixes).
4. Generate the migration via `pnpm db:generate` (or `pnpm drizzle-kit generate --custom --name=…` for raw SQL the DSL can't express). See the `db-migrate` skill.
