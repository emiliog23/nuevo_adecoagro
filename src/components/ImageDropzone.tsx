"use client";

import { useRef } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

export function ImageDropzone({ files, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const previews = files.map((f) => URL.createObjectURL(f));

  function handleFiles(list: FileList | null) {
    if (!list) return;
    onChange([...files, ...Array.from(list).filter((f) => f.type.startsWith("image/"))]);
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div
        className="border border-dashed border-[#d4d6d8] p-3 hover:border-[#1C6B30] transition-colors cursor-pointer"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {previews.length === 0 ? (
          <p className="text-xs text-[#9ea3aa] text-center py-2">Arrastrá imágenes o hacé click · PNG, JPG, WEBP</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {previews.map((src, idx) => (
              <div key={idx} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-16 h-16 object-cover border border-[#d4d6d8]" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(idx); }}
                  className="absolute top-0 right-0 hidden group-hover:flex w-4 h-4 bg-black/60 text-white text-[9px] items-center justify-center"
                >✕</button>
              </div>
            ))}
            <div className="w-16 h-16 border border-dashed border-[#d4d6d8] flex items-center justify-center text-[#9ea3aa] text-lg">+</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
