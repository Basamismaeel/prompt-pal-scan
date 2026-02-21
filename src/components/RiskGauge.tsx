import { useEffect, useState } from "react";
import type { ScanResult } from "@/lib/scanner";

interface RiskGaugeProps {
  result: ScanResult | null;
  /** AI-derived risk score (0-100). Combined with regex score for display. */
  aiRiskScore?: number | null;
}

export function RiskGauge({ result, aiRiskScore = null }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const regexScore = result?.totalScore ?? 0;
  const contextualScore = aiRiskScore ?? 0;
  const score = Math.min(
    100,
    result?.hasHighRiskMatch
      ? Math.max(regexScore, 75)
      : Math.max(regexScore, contextualScore)
  );

  useEffect(() => {
    setAnimatedScore(0);
    if (score === 0) return;
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const riskLevel: ScanResult["riskLevel"] =
    score <= 30 ? "safe" : score <= 60 ? "warning" : "high-risk";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (circumference * animatedScore) / 100;

  const colorClass =
    riskLevel === "safe"
      ? "text-safe"
      : riskLevel === "warning"
      ? "text-warning"
      : "text-danger";

  const glowClass =
    riskLevel === "safe"
      ? "glow-safe"
      : riskLevel === "warning"
      ? "glow-warning"
      : "glow-danger";

  const strokeColor =
    riskLevel === "safe"
      ? "hsl(var(--safe))"
      : riskLevel === "warning"
      ? "hsl(var(--warning))"
      : "hsl(var(--danger))";

  const label =
    riskLevel === "safe"
      ? "SAFE"
      : riskLevel === "warning"
      ? "WARNING"
      : "HIGH RISK";

  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 ${result ? glowClass : ""}`}>
      <span className="text-xs font-sans uppercase tracking-widest text-muted-foreground">Risk Score</span>
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-sans ${colorClass}`}>
            {animatedScore}
          </span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      {result && (
        <span className={`text-xs font-bold uppercase tracking-wider ${colorClass} ${
          riskLevel === "safe" ? "text-glow-safe" : riskLevel === "warning" ? "text-glow-warning" : "text-glow-danger"
        }`}>
          {label}
        </span>
      )}
    </div>
  );
}
