"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, type FormEvent } from "react";
import { Send, AlertCircle, StopCircle, ExternalLink, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";

interface RagSourceData {
  index: number;
  kind: "HLASOVANI" | "TISK" | "REC" | "INTERPELACE";
  id: number;
  title: string;
  snippet: string;
  score: number;
  url: string;
}

const SOURCE_KIND_LABEL: Record<RagSourceData["kind"], string> = {
  HLASOVANI: "Hlasování",
  TISK: "Tisk",
  REC: "Projev",
  INTERPELACE: "Interpelace",
};

/**
 * AI chat s podporou data parts z RAG.
 * Sources z poslední odpovědi se zobrazí v sekci "Zdroje" pod textem.
 */
export function ChatWindow() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  const isLoading = status === "submitted" || status === "streaming";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
      <div
        ref={scrollRef}
        className="h-[500px] overflow-y-auto p-4 space-y-4 scroll-smooth"
        role="log"
        aria-live="polite"
        aria-label="Konverzace s AI asistentem"
      >
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-16 px-4">
            <p className="text-sm">Zadejte dotaz nebo klikněte na navrhovanou otázku výše.</p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Odpovědi vycházejí z oficiálních dat PSP a jsou doplněny citacemi.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");

          // Extrakce RAG sources z data parts
          const sourcesData = m.parts
            .filter((p): p is { type: "data-sources"; data: RagSourceData[] } => p.type === "data-sources")
            .map((p) => p.data)
            .flat();

          return (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{text}</p>
                ) : (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <FormattedAnswer content={text} />
                    </div>
                    {sourcesData.length > 0 && <SourcesList sources={sourcesData} />}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2.5 shadow-sm" aria-label="AI přemýšlí">
              <div className="flex gap-1" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-4 py-2.5 text-sm bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Nepodařilo se získat odpověď</p>
                <p className="text-xs mt-1 opacity-80">Zkuste to prosím znovu za chvíli.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-3 flex gap-2 bg-background"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zeptejte se…"
          aria-label="Váš dotaz"
          maxLength={1000}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={() => stop()}
            className="px-3 py-2 rounded-md border border-border bg-background hover:bg-muted text-sm inline-flex items-center gap-1.5"
            aria-label="Zastavit generování"
          >
            <StopCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Zastavit</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Odeslat dotaz"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

/**
 * Renderuje seznam zdrojů z RAG pod textovou odpovědí.
 * Uživatel může kliknout na zdroj pro přechod na detail stránku.
 */
function SourcesList({ sources }: { sources: RagSourceData[] }) {
  return (
    <details className="mt-3 border-t border-border/50 pt-3" open>
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 select-none">
        <BookOpen className="h-3 w-3" />
        Zdroje ({sources.length})
      </summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((src) => (
          <li key={src.index} className="text-xs">
            <Link
              href={src.url}
              className="inline-flex items-start gap-1.5 hover:text-primary transition-colors"
            >
              <span className="font-mono font-bold text-primary">[{src.index}]</span>
              <span className="flex-1">
                <span className="text-muted-foreground">
                  {SOURCE_KIND_LABEL[src.kind]} #{src.id}
                </span>
                <span className="ml-1.5">{src.title}</span>
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Renderuje markdown-like odpovědi s citacemi jako horní index. */
function FormattedAnswer({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2 last:mb-0 break-words">
          {p.split(/(\[\d+\])/g).map((part, j) =>
            /^\[\d+\]$/.test(part) ? (
              <sup key={j} className="text-primary font-bold">
                {part}
              </sup>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </>
  );
}