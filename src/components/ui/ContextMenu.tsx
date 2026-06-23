"use client";

import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: never;
  active?: boolean;
}

export interface ContextMenuSeparator {
  separator: true;
  label?: never;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface Props {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [onClose]);

  // Adjust position so menu stays inside viewport
  const menuW = 220;
  const menuH = items.length * 36;
  const left = x + menuW > window.innerWidth ? x - menuW : x;
  const top = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 min-w-[200px]"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ("separator" in item && item.separator) {
          return <div key={i} className="my-1 border-t border-slate-100" />;
        }
        const it = item as ContextMenuItem;
        return (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => { it.onClick?.(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left disabled:opacity-40 ${
              it.danger
                ? "text-red-600 hover:bg-red-50"
                : it.active
                ? "font-medium hover:bg-slate-50"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {it.icon && (
              <span className={`w-4 h-4 shrink-0 flex items-center justify-center ${it.active ? "text-[#1C6B30]" : it.danger ? "text-red-500" : "text-slate-400"}`}>
                {it.icon}
              </span>
            )}
            <span className="flex-1">{it.label}</span>
            {it.active && (
              <svg className="w-3.5 h-3.5 text-[#1C6B30] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
