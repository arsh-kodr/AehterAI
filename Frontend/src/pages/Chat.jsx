import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { socket } from "../lib/socket";
import api from "../lib/api";
import { motion } from "framer-motion";

/*
Streaming-ready Chat page.
Client expects these socket events (preferred streaming API):
 - "ai-stream-start"  -> payload: { chat }
 - "ai-stream-chunk"  -> payload: { chat, chunk }   // partial text chunk
 - "ai-stream-end"    -> payload: { chat }          // streaming finished
Fallback listened event:
 - "ai-response"      -> payload: { chat, content } // full response (legacy)

Behavior:
- When user sends message, client emits "ai-message" (as before).
- Server can either emit "ai-response" (single).
- Or server can emit a "stream" sequence: start -> many chunk -> end.
- Client combines chunks into a streaming model message (updated in-place).
*/

export default function Chat() {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]); // { role, content, streaming? }
  const [chats, setChats] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const streamingRef = useRef({ active: false, index: null }); // track current streaming message index
  const listRef = useRef();

  // create chat on mount (same as before)
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await api.post("/chat", { title: "New Chat" });
        if (!mounted) return;
        setChatId(res.data.chat._id);
        // optional: load chat list
        try {
          const list = await api.get("/chat/list");
          setChats(list.data.chats || []);
        } catch (e) {}
        socket.connect(); // connect after cookie present
      } catch (err) {
        alert("Create chat failed. Make sure you're logged in.");
      }
    }
    init();
    return () => {
      mounted = false;
      socket.off("ai-stream-start");
      socket.off("ai-stream-chunk");
      socket.off("ai-stream-end");
      socket.off("ai-response");
      socket.disconnect();
    };
  }, []);

  // ensure scroll to bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // streaming & fallback listeners
  useEffect(() => {
    // STREAM START
    socket.on("ai-stream-start", (payload) => {
      if (!payload || payload.chat !== chatId) return;
      // append a placeholder model message with empty content and streaming flag
      setMessages((prev) => {
        const newMsg = { role: "model", content: "", streaming: true, createdAt: Date.now() };
        streamingRef.current = { active: true, index: prev.length };
        return [...prev, newMsg];
      });
      setTyping(true);
    });

    // STREAM CHUNK
    socket.on("ai-stream-chunk", (payload) => {
      if (!payload || payload.chat !== chatId) return;
      const chunk = payload.chunk || "";
      // append chunk to the streaming message in place
      setMessages((prev) => {
        const idx = streamingRef.current.index;
        // safety: if no streaming msg present, create one
        if (idx == null || idx < 0 || idx >= prev.length) {
          streamingRef.current = { active: true, index: prev.length };
          return [...prev, { role: "model", content: chunk, streaming: true, createdAt: Date.now() }];
        } else {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], content: (copy[idx].content || "") + chunk, streaming: true };
          return copy;
        }
      });
    });

    // STREAM END
    socket.on("ai-stream-end", (payload) => {
      if (!payload || payload.chat !== chatId) return;
      setMessages((prev) => {
        const idx = streamingRef.current.index;
        if (idx == null || idx < 0 || idx >= prev.length) {
          // nothing to finalize - ignore
          return prev;
        }
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], streaming: false, createdAt: Date.now() };
        return copy;
      });
      streamingRef.current = { active: false, index: null };
      setTyping(false);
    });

    // FALLBACK: single full response event (legacy)
    socket.on("ai-response", (payload) => {
      if (!payload || payload.chat !== chatId) return;
      // if currently streaming, finalize streaming and append if necessary
      if (streamingRef.current.active) {
        // replace streaming message content with final content
        setMessages((prev) => {
          const idx = streamingRef.current.index;
          if (idx != null && idx >= 0 && idx < prev.length) {
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], content: payload.content, streaming: false, createdAt: Date.now() };
            return copy;
          } else {
            return [...prev, { role: "model", content: payload.content, streaming: false, createdAt: Date.now() }];
          }
        });
        streamingRef.current = { active: false, index: null };
      } else {
        setMessages((prev) => [...prev, { role: "model", content: payload.content, streaming: false, createdAt: Date.now() }]);
      }
      setTyping(false);
    });

    return () => {
      socket.off("ai-stream-start");
      socket.off("ai-stream-chunk");
      socket.off("ai-stream-end");
      socket.off("ai-response");
    };
  }, [chatId]);

  // send user message
  function sendMessage() {
    if (!input.trim() || !chatId) return;
    const content = input;
    // append user message locally
    setMessages((prev) => [...prev, { role: "user", content, createdAt: Date.now() }]);
    setInput("");
    setTyping(true);

    // emit user's message
    socket.emit("ai-message", { chat: chatId, content });
    // NOTE: server can reply using streaming events or regular ai-response
  }

  // select previous chat
  function handleSelectChat(c) {
    if (!c) return;
    setChatId(c._id);
    setMessages([]);
    // try to fetch messages (optional endpoint)
    api.get(`/chat/${c._id}/messages`).then((res) => {
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    }).catch(()=>{});
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <Sidebar chats={chats} onSelect={handleSelectChat} activeId={chatId} />

      <div className="flex flex-col h-[70vh]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Chat</h3>
          <div className="text-sm text-gray-300">{chatId ? `ID: ${chatId.slice(-6)}` : ""}</div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 panel rounded-2xl">
          <ChatWindow messages={messages} />
        </div>

        {typing && (
          <div className="p-2 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="typing-dot bg-white/80" />
              <div className="typing-dot bg-white/60" />
              <div className="typing-dot bg-white/40" />
            </div>
            <div className="text-sm opacity-70">Aether AI is typing...</div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type to Aether..."
            className="flex-1 p-3 rounded-lg bg-transparent border border-white/6"
          />
          <motion.button whileTap={{ scale: 0.97 }} onClick={sendMessage} className="px-4 py-2 rounded bg-gradient-to-r from-purple-500 to-blue-400 text-black font-semibold">
            Send
          </motion.button>
        </div>
      </div>
    </div>
  );
}
