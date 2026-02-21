import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScanMatch } from "@/lib/scanner";

interface HighlightedPreviewProps {
  text: string;
  matches: ScanMatch[];
}

export function HighlightedPreview({ text, matches }: HighlightedPreviewProps) {
  if (!text) return null;

  // Build segments: plain text interleaved with highlighted matches
  const segments: Array<{ text: string; match?: ScanMatch }> = [];
  let cursor = 0;

  for (const m of matches) {
    if (m.startIndex > cursor) {
      segments.push({ text: text.slice(cursor, m.startIndex) });
    }
    segments.push({ text: text.slice(m.startIndex, m.endIndex), match: m });
    cursor = m.endIndex;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return (
    <ScrollArea className="h-[200px] rounded-lg border border-border bg-card">
      <pre className="p-3 text-xs leading-relaxed whitespace-pre-wrap break-all">
        {segments.map((seg, i) =>
          seg.match ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <mark
                  className={`rounded px-0.5 cursor-help ${
                    seg.match.severity === "high"
                      ? "bg-danger/25 text-danger"
                      : "bg-warning/25 text-warning"
                  }`}
                >
                  {seg.text}
                </mark>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <strong>{seg.match.label}</strong> — {seg.match.severity} risk (+{seg.match.score} pts)
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </pre>
    </ScrollArea>
  );
}
