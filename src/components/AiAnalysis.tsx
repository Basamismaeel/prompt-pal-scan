import { useState, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { stripRiskScoreLine } from "@/lib/ai-stream";

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;
const DEFAULT_HEIGHT = 320;

interface AiAnalysisProps {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

/** Strip all markdown so the UI shows only clean plain text (no #, *, **, etc.) */
function toPlainText(raw: string): string {
  let s = raw
    // Headers: keep only the text after ### or ## or #
    .replace(/^#+\s*(.*)$/gm, "$1")
    // Bold: **text** → text (repeat until none left, for nested/partial)
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    // Italic: *text* → text
    .replace(/\*([^*]*)\*/g, "$1")
    // Backticks: `code` → code
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

  s = s
    .split("\n")
    .map((line) => {
      return line
        .replace(/^\s*#+\s*/, "")
        .replace(/^\s*[-*]\s*/, "")
        .replace(/^\s*\d+\.\s*/, "")
        .replace(/\*\*([^*]*)\*\*/g, "$1")
        .replace(/\*([^*]*)\*/g, "$1")
        .trim();
    })
    .join("\n");

  // Remove any remaining asterisks so no * or ** ever appear
  s = s.replace(/\*\*/g, "").replace(/\*/g, "");

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Summary: first section (e.g. up to FINDINGS) or first 400 chars */
function getSummary(text: string): string {
  const plain = toPlainText(text);
  if (!plain.trim()) return "";
  const findingsIdx = plain.search(/\n\s*FINDINGS\s*\n/i);
  if (findingsIdx > 20) return plain.slice(0, findingsIdx).trim();
  const firstPara = plain.split(/\n\s*\n/)[0]?.trim() ?? "";
  return firstPara.length > 400 ? firstPara.slice(0, 400) + "…" : firstPara;
}

export function AiAnalysis({ content, isStreaming, error }: AiAnalysisProps) {
  const [view, setView] = useState<"full" | "summary">("full");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const resizeRef = useRef({ startY: 0, startHeight: 0 });
  const displayContent = stripRiskScoreLine(content);
  const plain = toPlainText(displayContent);
  const summary = getSummary(displayContent);
  const hasSummary = summary.length > 0 && summary !== plain;

  const onRed = useCallback(() => setIsCollapsed((c) => !c), []);
  const onYellow = useCallback(() => {
    setIsCollapsed(false);
    setIsMaximized(false);
    setHeight(DEFAULT_HEIGHT);
  }, []);
  const onGreen = useCallback(() => {
    setIsCollapsed(false);
    setIsMaximized((m) => !m);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startHeight: height };
    const onMove = (e: MouseEvent) => {
      const { startY, startHeight } = resizeRef.current;
      const delta = e.clientY - startY;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta)));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  }, [height]);

  /** Render plain text: section labels styled, rest line-by-line, no markdown */
  function renderPlain(text: string) {
    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      const isSectionLabel =
        /^(RISK SUMMARY|DETAILED FINDINGS|FINDINGS|RECOMMENDATIONS)$/i.test(trimmed) ||
        /^(1\.\s*)?(Risk Summary|Detailed Findings|Findings|Recommendations)$/i.test(trimmed);

      if (trimmed === "") {
        blocks.push(<div key={key++} className="h-2" />);
        continue;
      }

      if (isSectionLabel) {
        const label = trimmed.replace(/^\d+\.\s*/, "").trim();
        blocks.push(
          <div
            key={key++}
            className="mt-4 first:mt-0 pt-1 border-b border-border/50 pb-1.5 mb-1.5"
          >
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        );
        continue;
      }

      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-foreground/95 my-1">
          {trimmed}
        </p>
      );
    }

    return <div>{blocks}</div>;
  }

  const contentHeight = isMaximized ? "100%" : `${height}px`;

  const cardContent = (
    <>
      <div
        className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 cursor-default select-none shrink-0"
        onClick={isCollapsed ? onRed : undefined}
        role={isCollapsed ? "button" : undefined}
        aria-label={isCollapsed ? "Expand AI Analysis" : undefined}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRed(); }}
              aria-label="Close / collapse panel"
              className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/90 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onYellow(); }}
              aria-label="Restore default size"
              className="h-2.5 w-2.5 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/90 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onGreen(); }}
              aria-label={isMaximized ? "Exit full screen" : "Full screen"}
              className="h-2.5 w-2.5 rounded-full bg-[#28c840] hover:bg-[#28c840]/90 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
            AI Analysis
          </span>
        </div>
        <div className="flex items-center gap-1">
          {content && hasSummary && (
            <>
              <Button
                size="sm"
                variant={view === "summary" ? "secondary" : "ghost"}
                className="h-6 text-[10px] px-2"
                onClick={() => setView("summary")}
              >
                Summary
              </Button>
              <Button
                size="sm"
                variant={view === "full" ? "secondary" : "ghost"}
                className="h-6 text-[10px] px-2"
                onClick={() => setView("full")}
              >
                Full
              </Button>
            </>
          )}
          {isStreaming && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-safe" />
          )}
        </div>
      </div>
      {!isCollapsed && (
        <>
          <ScrollArea
            style={isMaximized ? { flex: 1, minHeight: 0 } : { height: contentHeight }}
            className={isMaximized ? "flex-1 min-h-0" : "min-h-[200px]"}
          >
            <div className="p-4">
          {error ? (
            <p className="text-danger text-xs">{error}</p>
          ) : content ? (
            <>
              <div className="text-sm text-foreground">
                {renderPlain(view === "summary" && hasSummary ? summary : plain)}
              </div>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
              )}
            </>
          ) : isStreaming ? (
            <p className="text-muted-foreground text-xs flex items-center gap-1.5">
              <span className="inline-block w-2 h-4 bg-muted-foreground/50 animate-pulse" />
              Analyzing…
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Run a scan to get AI-powered analysis (enable with API key for full analysis).
            </p>
          )}
            </div>
          </ScrollArea>
          {!isMaximized && (
            <div
              id="ai-analysis-resize-handle"
              role="separator"
              aria-label="Resize AI analysis panel"
              onMouseDown={handleResizeStart}
              className="h-2 w-full cursor-ns-resize flex items-center justify-center border-t border-border bg-border/30 hover:bg-border/50 transition-colors"
            >
              <span className="text-[10px] text-muted-foreground">⋮ drag to resize</span>
            </div>
          )}
        </>
      )}
    </>
  );

  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex flex-col flex-1 min-h-0 mx-auto w-full max-w-4xl rounded-lg border border-border bg-card overflow-hidden shadow-2xl">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {cardContent}
    </div>
  );
}
