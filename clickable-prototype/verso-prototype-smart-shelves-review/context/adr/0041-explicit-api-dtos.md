# Explicit API DTOs

Verso's ASP.NET Core API uses explicit request and response DTOs per operation rather than returning EF entities or persistence-shaped objects directly. The API remains raw-ish for frontend report transforms, but client-facing contracts stay stable across SQLite schema and internal model changes.