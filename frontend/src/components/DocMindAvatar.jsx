export default function DocMindAvatar({ className = "" }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-zinc-950 ${className}`}
      aria-hidden
    >
      DM
    </div>
  );
}
