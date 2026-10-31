import { useEffect, useRef, useState } from "react";
import DocMindMark from "./DocMindMark";

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV = [
  {
    id: "chat",
    label: "Chat",
    icon: "M8 10h8M8 14h5M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  {
    id: "library",
    label: "Library",
    icon: "M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5zM4 6.5V20.5",
  },
  {
    id: "compare",
    label: "Compare",
    icon: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
  },
];

function formatWhen(value) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupChats(chats) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const pinned = [];
  const today = [];
  const earlier = [];
  for (const chat of chats) {
    if (chat.pinned) pinned.push(chat);
    else if (new Date(chat.updatedAt) >= start) today.push(chat);
    else earlier.push(chat);
  }
  return [
    ["Pinned", pinned],
    ["Today", today],
    ["Earlier", earlier],
  ].filter(([, items]) => items.length);
}

export default function Sidebar({
  view,
  setView,
  stats,
  chats,
  activeChatId,
  apiOnline,
  mobileOpen,
  onClose,
  onNewChat,
  onOpenChat,
  onDeleteChat,
  onRenameChat,
  onPinChat,
}) {
  const groups = groupChats(chats);
  const [menu, setMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onClose]);

  const openMenu = (event, chat) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      id: chat.id,
      pinned: chat.pinned,
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - 176),
    });
  };

  const saveRename = async (id) => {
    const title = draftTitle.trim();
    setRenamingId(null);
    if (title) await onRenameChat(id, title);
  };

  return (
    <>
    {mobileOpen && (
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/60 md:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[min(292px,88vw)] shrink-0 flex-col border-r border-white/8 bg-[#0c0c0e] text-[#f4f4f5] transition-transform duration-200 md:static md:z-10 md:w-[292px] md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 px-4 pb-4 pt-5">
        <DocMindMark className="h-10 w-10 shadow-[0_0_20px_rgba(124,92,252,0.4)]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-semibold leading-none tracking-tight text-white">
            DevMind
          </p>
          <p className="mt-1 text-[11px] text-[#a1a1aa]">Document Q&A</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#a1a1aa] hover:bg-white/8 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/8">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  onClose?.();
                }}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  active
                    ? "bg-[#7c5cfc] text-white shadow-[0_0_16px_rgba(124,92,252,0.35)]"
                    : "text-[#a1a1aa] hover:bg-white/6 hover:text-white"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c5cfc] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,92,252,0.28)] transition hover:bg-[#6d4ef0]"
        >
          <span className="text-base leading-none">+</span>
          New chat
        </button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#71717a]">
            History
          </p>
          <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-[#a1a1aa]">
            {chats.length}
          </span>
        </div>
        <div className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pb-3 pr-1">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/12 px-3 py-6 text-center">
              <p className="text-sm text-[#e4e4e7]">No conversations yet</p>
              <p className="mt-1 text-xs text-[#71717a]">Ask a question to start history</p>
            </div>
          ) : (
            groups.map(([label, items]) => (
              <section key={label}>
                <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                  {label}
                </p>
                <ul className="space-y-1">
                  {items.map((chat) => {
                    const active = activeChatId === chat.id && view === "chat";
                    const editing = renamingId === chat.id;
                    return (
                      <li key={chat.id} className="group relative">
                        {editing ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              saveRename(chat.id);
                            }}
                            className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10"
                          >
                            <input
                              autoFocus
                              value={draftTitle}
                              onChange={(event) => setDraftTitle(event.target.value)}
                              onBlur={() => saveRename(chat.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") setRenamingId(null);
                              }}
                              className="w-full rounded-lg bg-[#09090b] px-2 py-1.5 text-[13px] text-white outline-none ring-1 ring-[#7c5cfc]/50"
                            />
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenChat(chat.id);
                              onClose?.();
                            }}
                            className={`w-full rounded-xl px-3 py-2.5 pr-16 text-left transition ${
                              active
                                ? "bg-white/8 text-white ring-1 ring-white/10"
                                : "text-[#d4d4d8] hover:bg-white/5 hover:text-white"
                            }`}
                            title={chat.title}
                          >
                            <span className="flex items-center gap-1.5">
                              {chat.pinned && (
                                <span className="text-[#c4b5fd]">
                                  <Icon d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16h14v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a3 3 0 0 0-6 0z" />
                                </span>
                              )}
                              <span className="block truncate text-[13px] font-medium">
                                {chat.title}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-[#71717a]">
                              {formatWhen(chat.updatedAt)}
                              {chat.preview ? ` · ${chat.preview}` : ""}
                            </span>
                          </button>
                        )}
                        {!editing && (
                          <div
                            className={`absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center ${
                              chat.pinned || menu?.id === chat.id
                                ? "opacity-100"
                                : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onPinChat(chat.id, !chat.pinned)}
                              className={`rounded-lg p-1 transition hover:bg-white/10 ${
                                chat.pinned ? "text-[#c4b5fd]" : "text-[#71717a]"
                              }`}
                              aria-label={chat.pinned ? "Unpin chat" : "Pin chat"}
                            >
                              <Icon d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16h14v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a3 3 0 0 0-6 0z" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => openMenu(event, chat)}
                              className="rounded-lg p-1 text-[#71717a] transition hover:bg-white/10 hover:text-white"
                              aria-label="Chat options"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                                <circle cx="6" cy="12" r="1.4" />
                                <circle cx="12" cy="12" r="1.4" />
                                <circle cx="18" cy="12" r="1.4" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <div className="m-3 rounded-2xl border border-white/8 bg-white/4 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#71717a]">Documents</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
              {stats.documentCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#71717a]">Passages</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
              {stats.chunkCount}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              apiOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-red-400"
            }`}
          />
          <span className={apiOnline ? "text-[#e4e4e7]" : "text-red-300"}>
            {apiOnline ? "Connected" : "API offline"}
          </span>
        </div>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c21] py-1 text-sm shadow-2xl shadow-black/50"
          style={{ top: menu.top, left: menu.left }}
        >
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-[#f4f4f5] hover:bg-white/8"
            onClick={() => {
              const chat = chats.find((item) => item.id === menu.id);
              setDraftTitle(chat?.title || "");
              setRenamingId(menu.id);
              setMenu(null);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-[#f4f4f5] hover:bg-white/8"
            onClick={() => {
              onPinChat(menu.id, !menu.pinned);
              setMenu(null);
            }}
          >
            {menu.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-red-300 hover:bg-white/8"
            onClick={() => {
              onDeleteChat(menu.id);
              setMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
