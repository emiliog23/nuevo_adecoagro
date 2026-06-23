export const COLOR_DOT: Record<string, string> = {
  AZUL:     "bg-blue-500",
  ROJO:     "bg-red-500",
  VERDE:    "bg-green-600",
  AMARILLO: "bg-yellow-400",
  BLANCO:   "bg-white border border-[#9ea3aa]",
};

/** Text color to use on top of COLOR_DOT backgrounds */
export const COLOR_TEXT: Record<string, string> = {
  BLANCO:   "text-gray-600",
  AMARILLO: "text-gray-700",
};

/** Returns Tailwind text class for avatar text on a given background color */
export function avatarTextClass(color?: string | null): string {
  return COLOR_TEXT[color ?? ""] ?? "text-white";
}

export function UserDot({ color, className = "" }: { color?: string | null; className?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[color ?? ""] ?? "bg-slate-400"} ${className}`}
    />
  );
}
