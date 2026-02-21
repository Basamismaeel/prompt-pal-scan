import { useState, useCallback, useRef, useEffect } from "react";
import { Shield, Scan, Zap, Wrench, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/TextInput";
import { RiskGauge } from "@/components/RiskGauge";
import { DetectedItemsList } from "@/components/DetectedItemsList";
import { HighlightedPreview } from "@/components/HighlightedPreview";
import { AiAnalysis } from "@/components/AiAnalysis";
import { scanText, redactDetectedSecrets, EXAMPLES, type ScanResult } from "@/lib/scanner";
import { streamAnalysis, parseAiRiskScore } from "@/lib/ai-stream";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [text, setText] = useState("");
  const textRef = useRef(text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  textRef.current = text;

  const [result, setResult] = useState<ScanResult | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [aiRiskScore, setAiRiskScore] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const score = parseAiRiskScore(aiContent);
    setAiRiskScore(score !== null ? score : null);
  }, [aiContent]);

  const handleScan = useCallback(() => {
    const fromDom = inputRef.current?.value;
    const valueToScan = (fromDom !== undefined && fromDom !== null ? fromDom : textRef.current) ?? "";
    if (!valueToScan.trim()) {
      toast({ title: "Empty input", description: "Paste some text to scan.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    setAiContent("");
    setAiError(null);
    setAiRiskScore(null);

    const scanResult = scanText(valueToScan);
    setResult(scanResult);
    setIsScanning(false);

    setIsStreaming(true);
    streamAnalysis({
      text: valueToScan,
      findings: scanResult.matches,
      onDelta: (chunk) => setAiContent((prev) => prev + chunk),
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setAiError(err);
        setIsStreaming(false);
        const isConfigError = /API_KEY|must be set|not configured/i.test(err);
        if (!isConfigError) toast({ title: "AI Analysis Error", description: err, variant: "destructive" });
      },
    });
  }, [toast]);

  const handleFix = useCallback(() => {
    const fromDom = inputRef.current?.value;
    const value = (fromDom !== undefined && fromDom !== null ? fromDom : textRef.current) ?? "";
    if (!value.trim()) {
      toast({ title: "Empty input", description: "Paste text to fix.", variant: "destructive" });
      return;
    }
    const fixedText = redactDetectedSecrets(value);
    if (fixedText === value) {
      toast({ title: "Nothing to fix", description: "No sensitive patterns detected." });
      return;
    }
    setText(fixedText);
    toast({ title: "Prompt fixed", description: "Secrets redacted. Re-scan to verify." });
  }, [toast]);

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
            Contextify
          </h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Prompt Security Scanner
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
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
          <div className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex-1 min-h-0">
              <TextInput ref={inputRef} value={text} onChange={setText} noBorder />
            </div>
            <div className="flex justify-end border-t border-border p-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFix}
                className="font-sans gap-2"
              >
                <Wrench className="h-4 w-4" />
                Fix
              </Button>
            </div>
          </div>
        </div>

        {/* Right panel — Results */}
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {/* Top row: gauge + detected items */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
            <RiskGauge result={result} aiRiskScore={aiRiskScore} />
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
