"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScriptedMessage {
  from: "maya" | "theo";
  text: string;
}

const SCRIPT: ScriptedMessage[] = [
  { from: "maya", text: "Hey! Did the new build go out?" },
  { from: "theo", text: "Just shipped it 🚀" },
  { from: "maya", text: "Nice, pulling it up now" },
  { from: "theo", text: "Let me know if anything looks off" },
  { from: "maya", text: "Looks perfect. Real-time works great!" },
];

type Phase =
  | { type: "typing"; index: number }
  | { type: "shown"; index: number }
  | { type: "pause" };

export function LiveDemoPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<Phase>({ type: "typing", index: 0 });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase.type === "typing") {
      timeout = setTimeout(() => {
        setVisibleCount(phase.index + 1);
        setPhase({ type: "shown", index: phase.index });
      }, 900);
    } else if (phase.type === "shown") {
      const next = phase.index + 1;
      timeout = setTimeout(() => {
        if (next < SCRIPT.length) {
          setPhase({ type: "typing", index: next });
        } else {
          setPhase({ type: "pause" });
        }
      }, 1100);
    } else {
      timeout = setTimeout(() => {
        setVisibleCount(0);
        setPhase({ type: "typing", index: 0 });
      }, 2200);
    }

    return () => clearTimeout(timeout);
  }, [phase]);

  const isTyping = phase.type === "typing";
  const typingFrom = isTyping ? SCRIPT[phase.index].from : null;

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
          T
        </span>
        <div>
          <p className="text-xs font-semibold text-neutral-900">Theo</p>
          <p className="flex items-center gap-1 text-[10px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </p>
        </div>
      </div>

      <div className="flex h-72 flex-col justify-end gap-2 p-4">
        {SCRIPT.slice(0, visibleCount).map((msg, i) => {
          const isMaya = msg.from === "maya";
          return (
            <div
              key={i}
              className={cn(
                "flex animate-fade-in-up",
                isMaya ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-1.5 text-xs shadow-sm",
                  isMaya
                    ? "rounded-br-sm bg-neutral-900 text-white"
                    : "rounded-bl-sm bg-neutral-100 text-neutral-900",
                )}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div
            className={cn(
              "flex",
              typingFrom === "maya" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1 rounded-2xl px-3 py-2.5",
                typingFrom === "maya"
                  ? "rounded-br-sm bg-neutral-900"
                  : "rounded-bl-sm bg-neutral-100",
              )}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 animate-bounce rounded-full",
                    typingFrom === "maya" ? "bg-white/70" : "bg-neutral-400",
                  )}
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 p-3">
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-2 text-xs text-neutral-400">
          Type a message
        </div>
      </div>
    </div>
  );
}
