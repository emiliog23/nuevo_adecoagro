"use client";

import { useState, useRef, useEffect } from "react";

interface User { id: string; name: string; }

interface Props {
  tecnicos: User[];          // full user list
  value: string[];           // selected IDs (including creator)
  creatorId: string;         // can't be removed
  onChange: (ids: string[]) => void;
}

export function TecnicosInput({ tecnicos, value, creatorId, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = tecnicos.filter(t => value.includes(t.id));
  const suggestions = tecnicos.filter(t =>
    !value.includes(t.id) &&
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  function add(id: string) {
    onChange([...value, id]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    if (id === creatorId) return; // can't remove creator
    onChange(value.filter(v => v !== id));
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !query) {
      // Remove last non-creator chip
      const removable = value.filter(id => id !== creatorId);
      if (removable.length) remove(removable[removable.length - 1]);
    }
    if (e.key === "Escape") setOpen(false);
  }

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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                className="text-[#5a5f67] hover:text-red-500 leading-none ml-0.5"
              >×</button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={selected.length ? "" : "Buscar técnico..."}
          className="flex-1 min-w-[120px] outline-none text-sm text-[#1d2023] bg-transparent py-0.5"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#d4d6d8] border-t-0 shadow-md z-20 max-h-44 overflow-y-auto">
          {suggestions.map(t => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(t.id); }}
              className="w-full text-left px-3 py-2 text-sm text-[#1d2023] hover:bg-[#f7f8f9] transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
