# EF Core for SQLite Persistence

Verso uses EF Core for SQLite persistence and migrations in Solid v1. Focused query and command services still own refresh merge behavior, Smart Shelf evaluation, Health Finding identity, Archive Export, and other product logic rather than placing that behavior directly in entity classes.