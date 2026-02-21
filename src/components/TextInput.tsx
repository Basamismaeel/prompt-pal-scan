import { useRef, useEffect, useState } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ value, onChange }: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = value.split("\n").length;
    setLineCount(Math.max(lines, 20));
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex h-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-none w-10 bg-secondary/50 overflow-hidden select-none py-3"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className="text-right pr-2 text-[10px] leading-[1.65rem] text-muted-foreground"
          >
            {i + 1}
          </div>
        ))}
      </div>
      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="Paste your prompt or text here to scan for secrets..."
        className="flex-1 resize-none bg-transparent p-3 text-xs leading-[1.65rem] text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
      />
    </div>
  );
}
