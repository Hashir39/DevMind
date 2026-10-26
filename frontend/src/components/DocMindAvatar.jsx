import DocMindMark from "./DocMindMark";

export default function DocMindAvatar({ className = "" }) {
  return (
    <DocMindMark
      className={`h-9 w-9 shrink-0 rounded-xl shadow-[0_0_16px_rgba(124,92,252,0.35)] ${className}`}
    />
  );
}
