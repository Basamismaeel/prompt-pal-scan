import { useRef, useEffect, useState, forwardRef } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  /** When true, omit outer border (e.g. when inside a card that provides it). */
  noBorder?: boolean;
}

export const TextInput = forwardRef<HTMLTextAreaElement, TextInputProps>(function TextInput({ value, onChange, noBorder }, ref) {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setRefs = (el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
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
    <div className={`flex h-full overflow-hidden ${noBorder ? "" : "rounded-lg border border-border bg-card"}`}>
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
        ref={setRefs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="Paste your prompt or text here to scan for secrets..."
        className="flex-1 resize-none bg-transparent p-3 text-xs leading-[1.65rem] text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
      />
    </div>
  );
});
