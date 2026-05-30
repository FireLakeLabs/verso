# Local Job Model for Refresh and Export

Refresh and export operations use an explicit local job model in Solid v1, with status, progress where available, timestamps, result summaries, and errors. Jobs may run in-process without a full queue, but the API and UI should treat refresh and export as lifecycle operations rather than opaque blocking button clicks.