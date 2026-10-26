import { useId } from "react";

export default function DocMindMark({ className = "h-10 w-10" }) {
  const id = `dm${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="0" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b6cf6" />
          <stop offset="1" stopColor="#3b1596" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id}-bg)`} />
      <path fill="#ffffff" d="M31 27 13 35 16.5 51 31 44.5Z" />
      <path fill="#e9e0ff" d="M33 27 51 35 47.5 51 33 44.5Z" />
      <path d="M32 28.5v15" stroke="#6d4ef0" strokeWidth="1.6" strokeLinecap="round" />
      <path fill="#ffffff" d="M32 7.5 34.2 13.4 40.4 15.6 34.2 17.8 32 23.7 29.8 17.8 23.6 15.6 29.8 13.4Z" />
    </svg>
  );
}
