"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("custos:chat");
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  });

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("custos:chat", JSON.stringify(msgs));
    } catch {}
  }, [msgs]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [open, msgs.length]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const id = crypto.randomUUID();
    setMsgs((m) => [...m, { id, role: "user", text }]);

    // --- demo reply stub (replace with /api/chat when ready) ---
    const run = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("custos:run") ?? "null");
      } catch {
        return null;
      }
    })();

    const summary = run
      ? `I see ${run.vendors?.length ?? 0} vendors in the latest run${
          run.aoi
            ? ` and an AOI near ${run.aoi?.center?.lat?.toFixed?.(
                2
              )}, ${run.aoi?.center?.lon?.toFixed?.(2)}`
            : ""
        }.`
      : `No recent run found—try "Run Report" from the map.`;

    const reply = [
      `Thanks — I can help with Custos. ${summary}`,
      `Ask me to: filter by AOI, explain a vendor's score, or export a narrative.`,
    ].join(" ");

    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: reply },
      ]);
    }, 350);
  }

  return (
    <>
      {/* Launcher button (always visible) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI chat"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-[10050] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-black shadow-lg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 w-12 h-12 grid place-items-center"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            d="M21 15a4 4 0 0 1-4 4H8l-5 3V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Backdrop overlay (click to close) */}
      {open && (
        <button
          aria-label="Close chat overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Messages panel (centered above the bottom input) */}
      {open && (
        <div
          className="fixed z-[10020] left-1/2 -translate-x-1/2 bottom-[136px] w-[min(92vw,800px)] max-h-[60vh]
               rounded-2xl border border-white/10 bg-black/85 backdrop-blur shadow-2xl overflow-hidden"
          role="dialog"
          aria-label="Custos Assistant"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="text-sm font-semibold">Custos Assistant</div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="max-h-[calc(60vh-44px)] overflow-auto px-3 py-3 space-y-2"
          >
            {msgs.length === 0 && (
              <div className="text-xs text-white/60">
                Ask about vendors, scores, AOI, or export options.
              </div>
            )}
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-white/10 ml-8"
                    : "bg-emerald-400/15 border border-emerald-400/30 mr-8"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Docked input bar (big, centered at bottom) */}
      {open && (
        <div
          className="fixed z-[10030] left-1/2 -translate-x-1/2 bottom-6 w-[min(92vw,800px)]"
          role="group"
          aria-label="Chat input"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/85 backdrop-blur p-2 shadow-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              className="flex-1 resize-none max-h-32 rounded-xl bg-white/5 px-4 py-3 text-base outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={send}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
