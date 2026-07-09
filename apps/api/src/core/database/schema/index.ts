// Top-level schema barrel — re-exports every domain's schema folder. Each
// domain lives in its own folder (`<domain>/{index.ts,<entity>.ts,enums.ts}`)
// with its own barrel; add a new domain by creating the folder and adding a
// line here. See SCHEMA_NAMING.md for the table-naming convention.
export * from './auth';
export * from './example';
