# Simple Frontend Backend Monorepo

Verso uses a simple monorepo layout with `src/backend` for the ASP.NET Core API, `src/frontend` for the Vite React app, and shared documentation at the repository root. This keeps the two local servers clearly separated without introducing extra packages or workspace complexity before the codebase needs it.