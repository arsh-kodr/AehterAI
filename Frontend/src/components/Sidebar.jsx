import React from "react";
import { motion } from "framer-motion";

export default function Sidebar({ chats = [], onSelect, activeId }) {
  return (
    <aside className="w-72 panel p-3 rounded-xl sidebar-collapsed">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Previous Chats</h4>
        <button className="text-sm opacity-70">New</button>
      </div>

      <div className="flex flex-col gap-2">
        {chats.length === 0 && <div className="text-sm text-gray-400">No chats yet.</div>}
        {chats.map((c) => (
          <motion.button
            key={c._id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(c)}
            className={`text-left p-2 rounded-md ${activeId === c._id ? "bg-gradient-to-r from-purple-600/60 to-blue-500/20" : "hover:bg-white/3"}`}
          >
            <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
            <div className="text-xs opacity-70">{new Date(c.lastActivity || c.createdAt).toLocaleString()}</div>
          </motion.button>
        ))}
      </div>
    </aside>
  );
}
