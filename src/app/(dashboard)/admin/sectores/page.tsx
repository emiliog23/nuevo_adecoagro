"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function SectoresAdminPage() {
  const { data: session } = useSession();
  const [fabricas, setFabricas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState("");

  const [fabricaForm, setFabricaForm] = useState({ show: false, editing: null as any });
  const [sectorForm, setSectorForm] = useState({ show: false, fabricaId: "", editing: null as any });
  const [subsectorForm, setSubsectorForm] = useState({ show: false, sectorId: "", editing: null as any });
  const [lineaForm, setLineaForm] = useState({ show: false, subsectorId: "", editing: null as any });
  const [maquinaForm, setMaquinaForm] = useState({ show: false, lineaId: "", editing: null as any });

  const canEdit = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role as string);
  const isAdmin = ["ADMIN","SUPERVISOR"].includes(session?.user?.role ?? "");

  async function fetchData() {
    const res = await fetch("/api/fabricas");
    setFabricas(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, []);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const del = async (url: string, msg: string) => {
    if (!confirm(msg)) return;
    await fetch(url, { method: "DELETE" });
    fetchData();
    window.dispatchEvent(new Event("plant-updated"));
  };

  const save = async (url: string, method: string, data: any, reset: () => void) => {
    setSaveError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); setSaveError(e.error ?? `Error ${res.status}`); return; }
    reset();
    fetchData();
    window.dispatchEvent(new Event("plant-updated"));
  };

  const BtnAdd = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} className="text-xs px-2 py-1 rounded-lg transition-colors font-medium" style={{ backgroundColor: "#e8f2eb", color: "#1C6B30" }}>{label}</button>
  );
  const BtnEdit = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
  );
  const BtnDel = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="text-slate-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estructura de Planta</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fábrica → Sector → Subsector → Línea → Máquina</p>
        </div>
        {canEdit && (
          <button onClick={() => setFabricaForm({ show: true, editing: null })}
            className="text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: "#1C6B30" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Fábrica
          </button>
        )}
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError("")} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {loading ? <div className="text-center text-slate-400 py-12">Cargando...</div> : (
        <div className="space-y-4">
          {fabricas.map((fab) => (
            <div key={fab.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* FÁBRICA */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200" style={{ backgroundColor: "#0f2318" }}>
                <button onClick={() => toggle(fab.id)}>
                  <svg className={`w-4 h-4 text-slate-300 transition-transform ${expanded[fab.id] ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 7l9-4 9 4M4 11h16M9 11v10M15 11v10M4 21V7M20 21V7" />
                </svg>
                <div className="flex-1">
                  <span className="font-bold text-white">{fab.nombre}</span>
                  {fab.descripcion && <span className="text-slate-400 text-sm ml-2">— {fab.descripcion}</span>}
                </div>
                <span className="text-xs text-slate-400">{fab.sectores?.length ?? 0} sectores</span>
                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={() => setSectorForm({ show: true, fabricaId: fab.id, editing: null })} className="text-xs px-2 py-1 rounded-lg font-medium text-green-300 hover:text-white">+ Sector</button>
                    <BtnEdit onClick={() => setFabricaForm({ show: true, editing: fab })} />
                    {isAdmin && <BtnDel onClick={() => del(`/api/fabricas/${fab.id}`, "¿Eliminar esta fábrica y todo su contenido?")} />}
                  </div>
                )}
              </div>

              {expanded[fab.id] && (
                <div>
                  {fab.sectores?.map((sector: any) => (
                    <div key={sector.id} className="border-b border-slate-100 last:border-0">
                      {/* SECTOR */}
                      <div className="flex items-center gap-3 px-5 py-3 pl-10 bg-slate-50">
                        <button onClick={() => toggle(sector.id)}>
                          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded[sector.id] ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: "#1C6B30" }} />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">{sector.nombre}</span>
                          {sector.descripcion && <span className="text-slate-400 text-xs ml-2">— {sector.descripcion}</span>}
                        </div>
                        <span className="text-xs text-slate-400">{sector.subsectores?.length ?? 0} subsectores</span>
                        {canEdit && (
                          <div className="flex gap-2">
                            <BtnAdd label="+ Subsector" onClick={() => setSubsectorForm({ show: true, sectorId: sector.id, editing: null })} />
                            <BtnEdit onClick={() => setSectorForm({ show: true, fabricaId: fab.id, editing: sector })} />
                            {isAdmin && <BtnDel onClick={() => del(`/api/sectores/${sector.id}`, "¿Eliminar este sector?")} />}
                          </div>
                        )}
                      </div>

                      {expanded[sector.id] && (
                        <div>
                          {sector.subsectores?.map((sub: any) => (
                            <div key={sub.id} className="border-t border-slate-100">
                              {/* SUBSECTOR */}
                              <div className="flex items-center gap-3 px-5 py-2.5 pl-16 bg-slate-50/50">
                                <button onClick={() => toggle(sub.id)}>
                                  <svg className={`w-3 h-3 text-slate-400 transition-transform ${expanded[sub.id] ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                <div className="flex-1"><span className="font-semibold text-slate-700 text-sm">{sub.nombre}</span></div>
                                <span className="text-xs text-slate-400">{sub.lineas?.length ?? 0} líneas</span>
                                {canEdit && (
                                  <div className="flex gap-2">
                                    <BtnAdd label="+ Línea" onClick={() => setLineaForm({ show: true, subsectorId: sub.id, editing: null })} />
                                    <BtnEdit onClick={() => setSubsectorForm({ show: true, sectorId: sector.id, editing: sub })} />
                                    {isAdmin && <BtnDel onClick={() => del(`/api/subsectores/${sub.id}`, "¿Eliminar este subsector?")} />}
                                  </div>
                                )}
                              </div>

                              {expanded[sub.id] && (
                                <div>
                                  {sub.lineas?.map((linea: any) => (
                                    <div key={linea.id} className="border-t border-slate-100">
                                      {/* LÍNEA */}
                                      <div className="flex items-center gap-3 px-5 py-2 pl-24">
                                        <button onClick={() => toggle(linea.id)}>
                                          <svg className={`w-3 h-3 text-slate-400 transition-transform ${expanded[linea.id] ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        <div className="flex-1"><span className="text-sm text-slate-700">{linea.nombre}</span></div>
                                        <span className="text-xs text-slate-400">{linea.maquinas?.length ?? 0} máquinas</span>
                                        {canEdit && (
                                          <div className="flex gap-2">
                                            <BtnAdd label="+ Máquina" onClick={() => setMaquinaForm({ show: true, lineaId: linea.id, editing: null })} />
                                            <BtnEdit onClick={() => setLineaForm({ show: true, subsectorId: sub.id, editing: linea })} />
                                            {isAdmin && <BtnDel onClick={() => del(`/api/lineas/${linea.id}`, "¿Eliminar esta línea?")} />}
                                          </div>
                                        )}
                                      </div>

                                      {expanded[linea.id] && (
                                        <div className="divide-y divide-slate-100">
                                          {linea.maquinas?.map((m: any) => (
                                            <div key={m.id} className="flex items-center gap-3 px-5 py-2 pl-32">
                                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                              <div className="flex-1">
                                                <span className="text-sm text-slate-700">{m.nombre}</span>
                                                {m.codigo && <span className="text-xs text-slate-400 ml-2 font-mono">{m.codigo}</span>}
                                              </div>
                                              {canEdit && (
                                                <div className="flex gap-2">
                                                  <BtnEdit onClick={() => setMaquinaForm({ show: true, lineaId: linea.id, editing: m })} />
                                                  {isAdmin && <BtnDel onClick={() => del(`/api/maquinas/${m.id}`, "¿Eliminar esta máquina?")} />}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          {linea.maquinas?.length === 0 && <p className="px-32 py-2 text-xs text-slate-400">Sin máquinas</p>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {sub.lineas?.length === 0 && <p className="px-24 py-2 text-xs text-slate-400">Sin líneas</p>}
                                </div>
                              )}
                            </div>
                          ))}
                          {sector.subsectores?.length === 0 && <p className="px-16 py-3 text-xs text-slate-400">Sin subsectores</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  {fab.sectores?.length === 0 && <p className="px-10 py-3 text-xs text-slate-400">Sin sectores</p>}
                </div>
              )}
            </div>
          ))}
          {fabricas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500">No hay fábricas configuradas</p>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {fabricaForm.show && (
        <Modal key={`fab-${fabricaForm.editing?.id ?? "new"}`}
          title={fabricaForm.editing ? "Editar Fábrica" : "Nueva Fábrica"}
          fields={[{ key: "nombre", label: "Nombre *", req: true, initial: fabricaForm.editing?.nombre ?? "" }, { key: "descripcion", label: "Descripción", req: false, initial: fabricaForm.editing?.descripcion ?? "" }]}
          extraData={{}}
          url={fabricaForm.editing ? `/api/fabricas/${fabricaForm.editing.id}` : "/api/fabricas"}
          method={fabricaForm.editing ? "PUT" : "POST"}
          onSave={save}
          onClose={() => setFabricaForm({ show: false, editing: null })}
          onDone={() => setFabricaForm({ show: false, editing: null })}
        />
      )}
      {sectorForm.show && (
        <Modal key={`sec-${sectorForm.fabricaId}-${sectorForm.editing?.id ?? "new"}`}
          title={sectorForm.editing ? "Editar Sector" : "Nuevo Sector"}
          fields={[{ key: "nombre", label: "Nombre *", req: true, initial: sectorForm.editing?.nombre ?? "" }, { key: "descripcion", label: "Descripción", req: false, initial: sectorForm.editing?.descripcion ?? "" }]}
          extraData={sectorForm.editing ? {} : { fabricaId: sectorForm.fabricaId }}
          url={sectorForm.editing ? `/api/sectores/${sectorForm.editing.id}` : "/api/sectores"}
          method={sectorForm.editing ? "PUT" : "POST"}
          onSave={save}
          onClose={() => setSectorForm({ show: false, fabricaId: "", editing: null })}
          onDone={() => setSectorForm({ show: false, fabricaId: "", editing: null })}
        />
      )}
      {subsectorForm.show && (
        <Modal key={`sub-${subsectorForm.sectorId}-${subsectorForm.editing?.id ?? "new"}`}
          title={subsectorForm.editing ? "Editar Subsector" : "Nuevo Subsector"}
          fields={[{ key: "nombre", label: "Nombre *", req: true, initial: subsectorForm.editing?.nombre ?? "" }, { key: "descripcion", label: "Descripción", req: false, initial: subsectorForm.editing?.descripcion ?? "" }]}
          extraData={subsectorForm.editing ? {} : { sectorId: subsectorForm.sectorId }}
          url={subsectorForm.editing ? `/api/subsectores/${subsectorForm.editing.id}` : "/api/subsectores"}
          method={subsectorForm.editing ? "PUT" : "POST"}
          onSave={save}
          onClose={() => setSubsectorForm({ show: false, sectorId: "", editing: null })}
          onDone={() => setSubsectorForm({ show: false, sectorId: "", editing: null })}
        />
      )}
      {lineaForm.show && (
        <Modal key={`lin-${lineaForm.subsectorId}-${lineaForm.editing?.id ?? "new"}`}
          title={lineaForm.editing ? "Editar Línea" : "Nueva Línea"}
          fields={[{ key: "nombre", label: "Nombre *", req: true, initial: lineaForm.editing?.nombre ?? "" }, { key: "descripcion", label: "Descripción", req: false, initial: lineaForm.editing?.descripcion ?? "" }]}
          extraData={lineaForm.editing ? {} : { subsectorId: lineaForm.subsectorId }}
          url={lineaForm.editing ? `/api/lineas/${lineaForm.editing.id}` : "/api/lineas"}
          method={lineaForm.editing ? "PUT" : "POST"}
          onSave={save}
          onClose={() => setLineaForm({ show: false, subsectorId: "", editing: null })}
          onDone={() => setLineaForm({ show: false, subsectorId: "", editing: null })}
        />
      )}
      {maquinaForm.show && (
        <MaquinaModal key={`maq-${maquinaForm.lineaId}-${maquinaForm.editing?.id ?? "new"}`}
          initial={maquinaForm.editing} lineaId={maquinaForm.lineaId} onSave={save}
          onClose={() => setMaquinaForm({ show: false, lineaId: "", editing: null })}
          onDone={() => setMaquinaForm({ show: false, lineaId: "", editing: null })}
        />
      )}
    </div>
  );
}

// ── Modales reutilizables ─────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  fields: { key: string; label: string; req?: boolean; initial: string }[];
  extraData: Record<string, string>;
  url: string; method: string;
  onSave: (url: string, method: string, data: any, reset: () => void) => Promise<void>;
  onClose: () => void; onDone: () => void;
}

function Modal({ title, fields, extraData, url, method, onSave, onClose, onDone }: ModalProps) {
  const [form, setForm] = useState<Record<string, string>>(Object.fromEntries(fields.map(f => [f.key, f.initial])));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(url, method, { ...form, ...extraData }, onDone);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100"><h2 className="font-semibold text-slate-800">{title}</h2></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input type="text" value={form[f.key]} onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" required={f.req} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 text-white font-medium py-2.5 rounded-lg text-sm" style={{ backgroundColor: saving ? "#7abf8a" : "#1C6B30" }}>{saving ? "Guardando..." : "Guardar"}</button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaquinaModal({ initial, lineaId, onSave, onClose, onDone }: {
  initial: any; lineaId: string;
  onSave: (url: string, method: string, data: any, reset: () => void) => Promise<void>;
  onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState({ nombre: initial?.nombre ?? "", descripcion: initial?.descripcion ?? "", codigo: initial?.codigo ?? "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data = initial ? { ...form } : { ...form, lineaId };
    await onSave(initial ? `/api/maquinas/${initial.id}` : "/api/maquinas", initial ? "PUT" : "POST", data, onDone);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100"><h2 className="font-semibold text-slate-800">{initial ? "Editar Máquina" : "Nueva Máquina"}</h2></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {[["nombre", "Nombre *", true], ["descripcion", "Descripción", false], ["codigo", "Código", false]].map(([k, l, r]) => (
            <div key={k as string}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{l as string}</label>
              <input type="text" value={(form as any)[k as string]} onChange={(e) => setForm(p => ({ ...p, [k as string]: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" required={!!r} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 text-white font-medium py-2.5 rounded-lg text-sm" style={{ backgroundColor: saving ? "#7abf8a" : "#1C6B30" }}>{saving ? "Guardando..." : "Guardar"}</button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
