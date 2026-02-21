import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScanMatch } from "@/lib/scanner";

interface DetectedItemsListProps {
  matches: ScanMatch[];
}

export function DetectedItemsList({ matches }: DetectedItemsListProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 text-center">
        <span className="text-2xl mb-2">🛡️</span>
        <span className="text-sm text-muted-foreground">No sensitive patterns detected</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px] rounded-lg border border-border bg-card">
      <div className="space-y-2 p-3">
        {matches.map((m) => (
          <div
            key={m.id}
            className={`rounded-md border p-3 text-xs ${
              m.severity === "high"
                ? "border-danger/30 bg-danger/5"
                : "border-warning/30 bg-warning/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-sans font-semibold text-foreground">{m.label}</span>
              <Badge
                className={`text-[10px] px-1.5 py-0 ${
                  m.severity === "high"
                    ? "bg-danger/20 text-danger border-danger/30"
                    : "bg-warning/20 text-warning border-warning/30"
                }`}
                variant="outline"
              >
                {m.severity === "high" ? "HIGH" : "MEDIUM"} +{m.score}
              </Badge>
            </div>
            <code className="block text-muted-foreground break-all">{m.masked}</code>
            <span className="text-muted-foreground mt-1 block">
              Line {m.line}, Col {m.column}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
