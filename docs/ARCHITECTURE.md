# Contextify — How It Works

**→ Open [docs/diagrams.html](diagrams.html) in your browser** to view all flowcharts rendered (Mermaid.js).  
In Cursor: right‑click `docs/diagrams.html` → **Open with Live Server** or **Reveal in File Explorer** and open in Chrome/Edge.

---

## High-level flow

```mermaid
flowchart TB
    subgraph UI["Frontend React"]
        A["User pastes text"]
        B["User clicks Scan"]
        C["handleScan reads value"]
        D["scanText regex patterns"]
        E["Risk Gauge and Detected List"]
        F["streamAnalysis to Supabase"]
        G["AI Analysis panel"]
    end

    subgraph Backend["Supabase Edge Function"]
        H["scan-analyze"]
        I["AI API OpenAI"]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    D --> F
    F --> H
    H --> I
    I -->|stream| H
    H -->|SSE| G
```

## Data flow (step by step)

```mermaid
sequenceDiagram
    participant User
    participant Index
    participant TextInput
    participant Scanner
    participant UI
    participant AStream as ai-stream
    participant EdgeFn as Edge Function
    participant AI

    User->>TextInput: Paste or type text
    TextInput->>Index: onChange value
    Note over Index: Update ref and state

    User->>Index: Click Scan
    Index->>Index: Get valueToScan from DOM or ref
    Index->>Scanner: scanText valueToScan

    loop Each regex pattern
        Scanner->>Scanner: Match AWS Stripe GitHub etc
    end
    Scanner-->>Index: ScanResult matches score riskLevel

    Index->>UI: setResult scanResult
    Note over UI: RiskGauge DetectedList HighlightedPreview

    Index->>AStream: streamAnalysis text and findings
    AStream->>EdgeFn: POST scan-analyze
    EdgeFn->>AI: Chat completion stream
    AI-->>EdgeFn: SSE stream
    EdgeFn-->>AStream: Response stream
    AStream->>Index: onDelta chunk
    Index->>UI: setAiContent
    Note over UI: AiAnalysis shows streamed text
```

## Component and module map

```mermaid
flowchart LR
    subgraph Pages
        Index["Index.tsx"]
    end

    subgraph Components
        TextInput["TextInput"]
        RiskGauge["RiskGauge"]
        DetectedList["DetectedItemsList"]
        HighlightedPreview["HighlightedPreview"]
        AiAnalysis["AiAnalysis"]
    end

    subgraph Lib
        Scanner["scanner.ts"]
        AiStream["ai-stream.ts"]
    end

    subgraph Supabase
        EdgeFn["scan-analyze Edge Function"]
    end

    Index --> TextInput
    Index --> RiskGauge
    Index --> DetectedList
    Index --> HighlightedPreview
    Index --> AiAnalysis
    Index --> Scanner
    Index --> AiStream
    AiStream --> EdgeFn
```

## Scanner logic (regex pipeline)

```mermaid
flowchart TB
    A["Input text"] --> B["For each pattern"]
    B --> C["New RegExp from pattern"]
    C --> D["exec loop find all matches"]
    D --> E["Overlap with covered range?"]
    E -->|Yes| F["Skip"]
    E -->|No| G["Add to matches"]
    F --> D
    G --> D
    D --> H["Sort matches by position"]
    H --> I["Sum scores cap at 100"]
    I --> J["riskLevel safe warning high-risk"]
    J --> K["Return ScanResult"]
```

## Environment and config

```mermaid
flowchart TB
    subgraph Frontend["Frontend .env"]
        VITE_URL["VITE_SUPABASE_URL"]
        VITE_KEY["VITE_SUPABASE_PUBLISHABLE_KEY"]
    end

    subgraph Edge["Edge Function secrets"]
        API_KEY["AI_API_KEY or OPENAI_API_KEY"]
        GATEWAY_URL["AI_GATEWAY_URL optional"]
        MODEL["AI_MODEL optional"]
    end

    Frontend --> SCAN_URL["Supabase functions scan-analyze"]
    Edge --> AI_API["OpenAI or custom AI API"]
```

---

View at [Mermaid Live Editor](https://mermaid.live): paste each code block into the editor. GitHub and VS Code with a Mermaid extension also render these.
