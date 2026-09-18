"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

type Message = {
  id: number;
  role: "bot" | "user";
  text: string;
};

const GREETING: Message = {
  id: 0,
  role: "bot",
  text: "Hi! I'm the NammaAPI assistant. Ask me about payouts, payment collection, salary processing or our APIs.",
};

const CANNED_REPLY =
  "Thanks for your message! This assistant is a preview and isn't connected to live AI yet. For detailed help, please use the Contact Sales page or the WhatsApp button and our team will get back to you.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMessage: Message = { id: nextId.current++, role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId.current++, role: "bot", text: CANNED_REPLY }]);
      setTyping(false);
    }, 700);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="NammaAPI chat assistant"
          className="fixed bottom-[5.5rem] right-5 z-50 flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl shadow-brand-navy/20 sm:right-6"
        >
          <div className="flex items-center justify-between bg-brand-gradient px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-white">NammaAPI Assistant</p>
              <p className="text-xs text-white/70">Preview — not connected to live AI</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-light/60 p-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-brand-primary text-white"
                      : "rounded-bl-sm border border-brand-border bg-white text-text-primary",
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-brand-border bg-white px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-secondary" />
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-secondary [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-secondary [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-brand-border p-3">
            <label htmlFor="chat-widget-input" className="sr-only">
              Type a message
            </label>
            <input
              id="chat-widget-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-brand-border bg-white px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white transition-opacity disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20L20 4M20 4H10M20 4V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-brand-primary/30 transition-transform duration-200 hover:scale-105 sm:right-6"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12C4 7.6 7.9 4 12.5 4C17.1 4 21 7.6 21 12C21 16.4 17.1 20 12.5 20C11.1 20 9.8 19.7 8.6 19.1L4 20L5.2 16.1C4.4 14.9 4 13.5 4 12Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
