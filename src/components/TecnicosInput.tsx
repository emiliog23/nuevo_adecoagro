"use client";

import { useState, useRef, useEffect } from "react";

interface User { id: string; name: string; color?: string; }

interface Props {
  tecnicos: User[];
  value: string[];
  creatorId: string;
  onChange: (ids: string[]) => void;
}

// Map color names (Spanish, accent-insensitive) → COLOR key
const COLOR_MAP: Record<string, string> = {
  azul: "AZUL", blue: "AZUL",
  rojo: "ROJO", red: "ROJO",
  verde: "VERDE", green: "VERDE",
  amarillo: "AMARILLO", yellow: "AMARILLO",
  blanco: "BLANCO", central: "BLANCO", white: "BLANCO",
};

const COLOR_LABEL: Record<string, string> = {
  AZUL: "Azul", ROJO: "Rojo", VERDE: "Verde", AMARILLO: "Amarillo", BLANCO: "Central",
};

function normalizeStr(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function TecnicosInput({ tecnicos, value, creatorId, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = tecnicos.filter(t => value.includes(t.id));

  // Detect if query matches a color name
  const queryNorm = normalizeStr(query);
  const matchedColor = COLOR_MAP[queryNorm] || null;

  // Users of that color not yet selected
  const colorUsers = matchedColor
    ? tecnicos.filter(t => t.color === matchedColor && !value.includes(t.id))
    : [];

  // Regular suggestions (name match, not selected)
  const suggestions = tecnicos.filter(t =>
    !value.includes(t.id) &&
    normalizeStr(t.name).includes(queryNorm)
  );

  function add(id: string) {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function addByColor(color: string) {
    const toAdd = tecnicos.filter(t => t.color === color && !value.includes(t.id)).map(t => t.id);
    if (toAdd.length) onChange([...value, ...toAdd]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    if (id === creatorId) return;
    onChange(value.filter(v => v !== id));
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !query) {
      const removable = value.filter(id => id !== creatorId);
      if (removable.length) remove(removable[removable.length - 1]);
    }
    if (e.key === "Escape") setOpen(false);
  }

  const showDropdown = open && query.length > 0 && (suggestions.length > 0 || colorUsers.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1.5 px-2 py-1.5 border border-[#d4d6d8] bg-white focus-within:border-[#1C6B30] cursor-text min-h-[38px]"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1 bg-[#e8e9eb] text-[#1d2023] text-xs px-2 py-1 rounded">
            {t.name}
            {t.id !== creatorId && (
              <button type="button" onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                className="text-[#5a5f67] hover:text-red-500 leading-none ml-0.5">×</button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={selected.length ? "" : "Buscar por nombre o turno (ej: verde)..."}
          className="flex-1 min-w-[140px] outline-none text-sm text-[#1d2023] bg-transparent py-0.5"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#d4d6d8] border-t-0 shadow-md z-20 max-h-52 overflow-y-auto">
          {/* Color shortcut — add all users of that color at once */}
          {matchedColor && colorUsers.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addByColor(matchedColor); }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-[#1C6B30] hover:bg-[#f0f7f2] transition-colors border-b border-[#e8e9eb]"
            >
              ＋ Agregar todos · {COLOR_LABEL[matchedColor]} ({colorUsers.length})
            </button>
          )}
          {/* Individual suggestions */}
          {suggestions.map(t => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(t.id); }}
              className="w-full text-left px-3 py-2 text-sm text-[#1d2023] hover:bg-[#f7f8f9] transition-colors flex items-center gap-2"
            >
              <span className="text-[10px] text-[#9ea3aa]">{COLOR_LABEL[t.color ?? ""] ?? ""}</span>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
