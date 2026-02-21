import { ScrollArea } from "@/components/ui/scroll-area";

interface AiAnalysisProps {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

export function AiAnalysis({ content, isStreaming, error }: AiAnalysisProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-safe/60" />
        </div>
        <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
          AI Analysis
        </span>
        {isStreaming && (
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-safe" />
        )}
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {error ? (
            <span className="text-danger">Error: {error}</span>
          ) : content ? (
            <>
              <span className="text-terminal">{content}</span>
              {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-terminal animate-pulse ml-0.5" />}
            </>
          ) : isStreaming ? (
            <span className="text-muted-foreground">
              <span className="inline-block w-1.5 h-3.5 bg-terminal animate-pulse mr-1" />
              Analyzing...
            </span>
          ) : (
            <span className="text-muted-foreground">
              Run a scan to get AI-powered analysis
            </span>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
