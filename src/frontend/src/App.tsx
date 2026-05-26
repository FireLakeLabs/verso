import { Activity, Archive, HeartPulse, Library, Tags } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { shellDestinations, shellSummary } from "./shell-model";

const shellIcons = {
  "Library Table": Library,
  "Health Check": HeartPulse,
  Tags,
  "Archive Export": Archive,
};

export function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Personal Library Companion</p>
          <h1 id="page-title">Verso</h1>
          <p className="lede">{shellSummary}</p>
        </div>
        <Button type="button">
          <Activity aria-hidden="true" />
          Ready for import
        </Button>
      </section>

      <section className="overview-grid" aria-label="Verso starting points">
        {shellDestinations.map((label) => {
          const Icon = shellIcons[label];

          return (
            <Card key={label}>
              <CardHeader>
                <Icon aria-hidden="true" />
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Placeholder surface for the Solid v1 scaffold.</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
