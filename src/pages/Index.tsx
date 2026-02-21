import { useState, useCallback } from "react";
import { Shield, Scan, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/TextInput";
import { RiskGauge } from "@/components/RiskGauge";
import { DetectedItemsList } from "@/components/DetectedItemsList";
import { HighlightedPreview } from "@/components/HighlightedPreview";
import { AiAnalysis } from "@/components/AiAnalysis";
import { scanText, EXAMPLES, type ScanResult } from "@/lib/scanner";
import { streamAnalysis } from "@/lib/ai-stream";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const handleScan = useCallback(() => {
    if (!text.trim()) {
      toast({ title: "Empty input", description: "Paste some text to scan.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    setAiContent("");
    setAiError(null);

    // Run regex scan
    const scanResult = scanText(text);
    setResult(scanResult);
    setIsScanning(false);

    // Start AI streaming analysis
    setIsStreaming(true);
    streamAnalysis({
      text,
      findings: scanResult.matches,
      onDelta: (chunk) => setAiContent((prev) => prev + chunk),
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setAiError(err);
        setIsStreaming(false);
        toast({ title: "AI Analysis Error", description: err, variant: "destructive" });
      },
    });
  }, [text, toast]);

  const loadExample = (key: keyof typeof EXAMPLES) => {
    setText(EXAMPLES[key]);
    setResult(null);
    setAiContent("");
    setAiError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-sans text-lg font-bold text-foreground">
            PromptGuard
          </h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Prompt Security Scanner
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Examples:</span>
          <Button size="sm" variant="ghost" className="text-xs text-safe h-7" onClick={() => loadExample("clean")}>
            Clean
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-warning h-7" onClick={() => loadExample("mixed")}>
            Mixed
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-danger h-7" onClick={() => loadExample("dangerous")}>
            Dangerous
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:flex-row gap-0">
        {/* Left panel — Input */}
        <div className="flex flex-col lg:w-[45%] border-r border-border p-4 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans">Input</span>
            <Button
              onClick={handleScan}
              disabled={isScanning || isStreaming}
              className="bg-primary text-primary-foreground hover:bg-primary/80 font-sans gap-2"
            >
              {isScanning ? (
                <><Zap className="h-4 w-4 animate-pulse" /> Scanning...</>
              ) : (
                <><Scan className="h-4 w-4" /> Scan</>
              )}
            </Button>
          </div>
          <div className="flex-1 min-h-[300px] lg:min-h-0">
            <TextInput value={text} onChange={setText} />
          </div>
        </div>

        {/* Right panel — Results */}
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {/* Top row: gauge + detected items */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
            <RiskGauge result={result} />
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans mb-2 block">
                Detected Items ({result?.matches.length ?? 0})
              </span>
              <DetectedItemsList matches={result?.matches ?? []} />
            </div>
          </div>

          {/* Highlighted preview */}
          {result && result.matches.length > 0 && (
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans mb-2 block">
                Highlighted Preview
              </span>
              <HighlightedPreview text={text} matches={result.matches} />
            </div>
          )}

          {/* AI Analysis */}
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans mb-2 block">
              AI Security Analysis
            </span>
            <AiAnalysis content={aiContent} isStreaming={isStreaming} error={aiError} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
