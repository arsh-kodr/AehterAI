import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/* messages: { role, content, streaming? } */
export default function ChatWindow({ messages = [] }) {
  const ref = useRef();

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div ref={ref} className="p-3 space-y-3">
      {messages.map((m, i) => {
        const isUser = m.role === "user";
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[80%] px-4 py-3 rounded-2xl ${isUser ? "ml-auto bg-gradient-to-r from-purple-400 to-blue-400 text-black" : "bg-white/6"}`}>
            <div className="whitespace-pre-wrap break-words">
              {m.content}
              {m.streaming && (
                // caret for streaming
                <span className="inline-block ml-1 w-1 h-5 align-middle bg-white" style={{ animation: "stream-caret 1s steps(1) infinite" }} />
              )}
            </div>
            <div className="text-xs opacity-60 mt-1">{new Date(m.createdAt || Date.now()).toLocaleTimeString()}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
