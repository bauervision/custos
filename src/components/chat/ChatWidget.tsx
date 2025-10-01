"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Message[]>(() => {
    // restore across pages
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

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const id = crypto.randomUUID();
    setMsgs((m) => [...m, { id, role: "user", text }]);

    // ---- BACKEND HOOK ----
    // If you add a real endpoint, post to /api/chat here and stream back tokens.
    // For now, we reply with a tiny placeholder derived from the last run context, if present.
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
      `Thanks — I'm here to help with Custos. ${summary}`,
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
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI chat"
        className="fixed bottom-4 right-4 z-[100] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-black shadow-lg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 w-12 h-12 grid place-items-center"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            d="M21 15a4 4 0 0 1-4 4H8l-5 3V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-[100] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-black/85 backdrop-blur shadow-2xl">
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
            className="max-h-[50vh] overflow-auto px-3 py-2 space-y-2"
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
          <div className="flex items-center gap-2 p-2 border-t border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={send}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
