"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ESTADO_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", EN_CURSO: "En Curso", COMPLETADA: "Completada", COMPLETADA_CON_PROBLEMAS: "Con problemas", IMPOSIBLE_TERMINAR: "Imposible", CANCELADA: "Cancelada" };
const PRIORIDAD_LABEL: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" };
const TIPO_LABEL: Record<string, string> = { REPORTE_INTERVENCION: "Reportes", ORDEN_TRABAJO: "OT", CIERRE_TURNO: "Cierres", DESCARGA_REPUESTOS: "Descargas" };
const TURNO_LABEL: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };
const COLOR_USER: Record<string, string> = { AZUL: "#3b82f6", ROJO: "#ef4444", VERDE: "#16a34a", AMARILLO: "#eab308", BLANCO: "#d1d5db" };
const CHART_COLORS = ["#1C6B30", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#3b82f6", "#ef4444", "#eab308"];

const PERIODOS = [
  { label: "Últimos 7 días",  days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
  { label: "Este año",        days: 365 },
];

function fmt(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-[#d4d6d8] p-4">
      <p className="text-xs text-[#5a5f67] uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#1d2023]">{value}</p>
      {sub && <p className="text-xs text-[#9ea3aa] mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#d4d6d8]">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8]">
        <p className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AnalisisPage() {
  const [dias, setDias] = useState(30);
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const desde = useCustom && customDesde ? customDesde : format(subDays(new Date(), dias), "yyyy-MM-dd");
  const hasta = useCustom && customHasta ? customHasta : format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, error: swrError } = useSWR(
    `/api/analytics?desde=${desde}&hasta=${hasta}`,
    (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    { revalidateOnFocus: false }
  );

  if (isLoading || (!data && !swrError)) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-[#d4d6d8] px-6 py-3">
          <h1 className="text-sm font-semibold text-[#1d2023]">Análisis de Datos</h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-[#5a5f67]">Cargando análisis...</div>
      </div>
    );
  }

  if (swrError || data?.error) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-[#d4d6d8] px-6 py-3">
          <h1 className="text-sm font-semibold text-[#1d2023]">Análisis de Datos</h1>
        </div>
        <div className="flex-1 flex items-center justify-center flex-col gap-2">
          <p className="text-sm text-red-500 font-medium">Error al cargar el análisis</p>
          <p className="text-xs text-[#9ea3aa]">{data?.detail ?? swrError?.message ?? "Error desconocido"}</p>
          <p className="text-xs text-[#9ea3aa]">Revisá los logs del servidor para más detalles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-4 flex-wrap shrink-0">
        <h1 className="text-sm font-semibold text-[#1d2023]">Análisis de Datos</h1>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {PERIODOS.map((p) => (
            <button key={p.days} onClick={() => { setDias(p.days); setUseCustom(false); }}
              className={`text-xs px-3 py-1.5 border transition-colors ${!useCustom && dias === p.days ? "border-[#1C6B30] bg-[#f0f7f2] text-[#1C6B30] font-semibold" : "border-[#d4d6d8] text-[#5a5f67] hover:border-[#b0b4b8]"}`}>
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 text-xs text-[#5a5f67]">
            <input type="date" value={customDesde} onChange={(e) => { setCustomDesde(e.target.value); setUseCustom(true); }}
              className="border border-[#d4d6d8] px-2 py-1 text-xs focus:outline-none focus:border-[#1C6B30]" />
            <span>→</span>
            <input type="date" value={customHasta} onChange={(e) => { setCustomHasta(e.target.value); setUseCustom(true); }}
              className="border border-[#d4d6d8] px-2 py-1 text-xs focus:outline-none focus:border-[#1C6B30]" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6" style={{ backgroundColor: "#f0f1f3" }}>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPI label="Total Documentos" value={data.totalDocumentos} />
          <KPI label="Reportes" value={data.totalReportes} sub="Intervenciones en el período" />
          <KPI label="OT Abiertas" value={data.ordenesAbiertas} sub={`${data.ordenesCerradas} cerradas`} />
          <KPI label="Duración Prom. Intervención" value={fmt(data.avgDuracionMin)} sub="Tiempo promedio de reparación" />
        </div>

        {/* Actividad semanal — ancho completo */}
        <Card title="Actividad semanal — documentos creados por semana">
          {data.semanas?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.semanas}>
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(l) => `Semana del ${l}`} />
                <Line type="monotone" dataKey="count" name="Documentos" stroke="#1C6B30" strokeWidth={2} dot={{ r: 3, fill: "#1C6B30" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin datos</p>}
        </Card>

        {/* Reportes por tipo de falla + OT por estado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Reportes por tipo de falla">
            {data.reportesPorFalla?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.reportesPorFalla} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="tipoFalla" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1C6B30" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin reportes</p>}
          </Card>

          <Card title="Órdenes de trabajo por estado">
            {data.otsPorEstado?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.otsPorEstado.map((o: any) => ({ ...o, label: ESTADO_LABEL[o.estado] ?? o.estado }))}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip  />
                  <Bar dataKey="count" fill="#374151" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin OT</p>}
          </Card>
        </div>

        {/* OT por prioridad + Cierres por turno */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="OT por prioridad">
            {data.otsPorPrioridad?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.otsPorPrioridad.map((o: any) => ({ ...o, label: PRIORIDAD_LABEL[o.prioridad] ?? o.prioridad }))}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6b7280" name="OT" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin datos</p>}
          </Card>

        </div>

        {/* Máquinas + Técnicos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Máquinas con más intervenciones">
            {data.maquinasTop?.filter((m: any) => m.nombre).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.maquinasTop.filter((m: any) => m.nombre)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1C6B30" name="Intervenciones" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin datos</p>}
          </Card>

          <Card title="Intervenciones por técnico">
            {data.tecnicosInterv?.filter((t: any) => t.name).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.tecnicosInterv.filter((t: any) => t.name)}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Intervenciones">
                    {data.tecnicosInterv.filter((t: any) => t.name).map((t: any, i: number) => (
                      <Cell key={i} fill={COLOR_USER[t.color ?? ""] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-[#9ea3aa] text-center py-8">Sin datos</p>}
          </Card>
        </div>

        {/* Repuestos más usados */}
        {data.repuestosTop?.length > 0 && (
          <Card title="Repuestos más utilizados">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.repuestosTop} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={180} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#374151" name="Cantidad usada" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* OT por técnico */}
        {data.tecnicosOT?.filter((t: any) => t.name).length > 0 && (
          <Card title="Órdenes de trabajo asignadas por técnico">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.tecnicosOT.filter((t: any) => t.name)}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="OT">
                  {data.tecnicosOT.filter((t: any) => t.name).map((t: any, i: number) => (
                    <Cell key={i} fill={COLOR_USER[t.color ?? ""] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}
