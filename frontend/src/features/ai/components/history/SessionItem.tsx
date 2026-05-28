import * as React from "react"
import { motion } from "framer-motion"
import { ConversationSession } from "../../services/persistence/db"
import { MessageSquare, Clock } from "lucide-react"

interface SessionItemProps {
  session: ConversationSession
  isActive: boolean
  onClick: (session: ConversationSession) => void
}

export function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  // We can format the date elegantly
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric"
  }).format(new Date(session.updatedAt))

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(session)}
      className={`
        w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2
        ${isActive 
          ? "bg-slate-800/50 border-slate-700/50 shadow-sm" 
          : "bg-transparent border-transparent hover:bg-slate-800/30"}
      `}
    >
      <div className="flex items-start gap-3">
        <MessageSquare className={`w-4 h-4 mt-0.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? "text-slate-200" : "text-slate-400"}`}>
            {session.title || "Clinical Evaluation"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">{timeLabel}</span>
            <span className="text-xs text-slate-600 px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/50">
              {session.messages.length} msgs
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}
