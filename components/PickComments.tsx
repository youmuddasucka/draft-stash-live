"use client";

import { useState, useEffect } from "react";

type Comment = { id: string; content: string; created_at: string; name: string | null };
type Reactions = { too_high: number; too_low: number; incorrect: number };
type ReactionKey = keyof Reactions;

const REACTIONS: { key: ReactionKey; label: string; symbol: string }[] = [
  { key: "too_high",  label: "Value Too High", symbol: "↑" },
  { key: "too_low",   label: "Value Too Low",  symbol: "↓" },
  { key: "incorrect", label: "Pick Is Wrong",  symbol: "✕" },
];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function PickComments({ pickId }: { pickId: string }) {
  const [reactions, setReactions] = useState<Reactions>({ too_high: 0, too_low: 0, incorrect: 0 });
  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reactions/${pickId}`)
      .then(r => r.json())
      .then(setReactions)
      .catch(() => {});
    fetch(`/api/comments/${pickId}`)
      .then(r => r.json())
      .then((data) => { if (Array.isArray(data)) setComments(data); })
      .catch(() => {});
  }, [pickId]);

  async function handleReaction(key: ReactionKey) {
    if (activeReaction === key) {
      setActiveReaction(null);
      setReactions(r => ({ ...r, [key]: Math.max(0, r[key] - 1) }));
      fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pick_id: pickId, reaction_type: key, delta: -1 }),
      }).catch(() => {});
    } else {
      if (activeReaction) {
        const prev = activeReaction;
        setReactions(r => ({ ...r, [prev]: Math.max(0, r[prev] - 1) }));
        fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pick_id: pickId, reaction_type: prev, delta: -1 }),
        }).catch(() => {});
      }
      setActiveReaction(key);
      setReactions(r => ({ ...r, [key]: r[key] + 1 }));
      fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pick_id: pickId, reaction_type: key, delta: 1 }),
      }).catch(() => {});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pick_id: pickId, content: content.trim(), name: name.trim() || null }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments(c => [newComment, ...c]);
      setContent("");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to post comment.");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-[10px] uppercase tracking-widest font-black opacity-25">Community</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Reactions */}
      <div className="grid grid-cols-3 gap-2">
        {REACTIONS.map(({ key, label, symbol }) => {
          const active = activeReaction === key;
          return (
            <button
              key={key}
              onClick={() => handleReaction(key)}
              className={`glass-surface rounded-xl px-3 py-3.5 flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                active
                  ? "border-[#E6B85C]/50 bg-[#E6B85C]/5"
                  : "border-white/5 hover:border-white/15"
              }`}
            >
              <span className={`text-base font-black leading-none transition-colors ${active ? "text-[#E6B85C]" : "opacity-30"}`}>
                {symbol}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight transition-colors ${active ? "text-[#E6B85C]" : "opacity-30"}`}>
                {label}
              </span>
              <span className={`text-sm font-black transition-colors ${active ? "text-[#E6B85C]" : "opacity-50"}`}>
                {reactions[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {content.length > 0 && (
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            placeholder="Name (optional)"
            className="glass-surface rounded-xl border border-white/10 w-full px-4 py-2.5 text-sm focus:border-white/25 focus:outline-none placeholder:opacity-20 bg-transparent"
          />
        )}
        <div className="relative">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={800}
            rows={3}
            placeholder="Leave a comment..."
            className="glass-surface rounded-xl border border-white/10 w-full px-4 py-3 text-sm resize-none focus:border-white/25 focus:outline-none placeholder:opacity-20 bg-transparent leading-relaxed"
          />
          {content.length > 0 && (
            <span className={`absolute bottom-2.5 right-3 text-[10px] font-mono pointer-events-none ${content.length > 700 ? "text-yellow-400/60" : "opacity-20"}`}>
              {content.length}/800
            </span>
          )}
        </div>
        {error && (
          <p className="text-red-400/70 text-[11px] font-semibold">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="glass-surface rounded-lg px-5 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-white/20 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </form>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-[11px] opacity-20 text-center py-6 tracking-wide">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="glass-surface rounded-xl border border-white/5 px-4 py-3.5 space-y-1.5">
              <p className="text-sm leading-relaxed opacity-75 whitespace-pre-wrap break-words">{c.content}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{c.name?.trim() || "Anonymous"}</span>
                <span className="opacity-15 text-[10px]">·</span>
                <time className="text-[10px] opacity-20 font-mono">{relativeTime(c.created_at)}</time>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
