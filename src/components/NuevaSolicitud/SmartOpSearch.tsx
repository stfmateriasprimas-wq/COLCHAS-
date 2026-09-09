import React, { useState } from 'react';
import { Search, Sparkles, Table, X, Check, ArrowRight, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { MonitoreoItem } from '../../types';

interface SmartOpSearchProps {
  monitoreoList: MonitoreoItem[];
  onSelectOp: (item: MonitoreoItem) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SmartOpSearch: React.FC<SmartOpSearchProps> = ({ 
  monitoreoList, 
  onSelectOp,
  onRefresh,
  isRefreshing = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Total OPs with assigned number vs total rows
  const opsWithNumber = monitoreoList.filter(m => Boolean(m.op && m.op.trim()));

  const filtered = query.trim() === '' ? [] : monitoreoList.filter(item => 
    (item.op && item.op.toLowerCase().includes(query.toLowerCase())) ||
    (item.tela && item.tela.toLowerCase().includes(query.toLowerCase())) ||
    (item.referencia && item.referencia.toLowerCase().includes(query.toLowerCase())) ||
    (item.mt && item.mt.toLowerCase().includes(query.toLowerCase())) ||
    (item.color && item.color.toLowerCase().includes(query.toLowerCase()))
  );

  const modalFiltered = monitoreoList.filter(item => {
    const q = modalSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.op && item.op.toLowerCase().includes(q)) ||
      (item.tela && item.tela.toLowerCase().includes(q)) ||
      (item.referencia && item.referencia.toLowerCase().includes(q)) ||
      (item.mt && item.mt.toLowerCase().includes(q)) ||
      (item.color && item.color.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-white dark:text-zinc-950">
        
        {/* Top Header Row with Perfectly Aligned Button and Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-zinc-800/80 dark:border-zinc-200 pb-3.5">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/70 dark:bg-emerald-100 border border-emerald-500/40 dark:border-emerald-300 text-emerald-400 dark:text-emerald-700 flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white dark:text-zinc-950 font-mono">
                  BÚSQUEDA INTELIGENTE DE OP
                </h4>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#072417] dark:bg-emerald-50 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 dark:border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span>GOOGLE SHEETS MONITOREO</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5 font-sans">
                Filtra OPs en tiempo real ({opsWithNumber.length} asignadas • {monitoreoList.length} en hoja oficial)
              </p>
            </div>
          </div>

          {/* Action Buttons: VER OPs POR HACER (Automático en Tiempo Real) */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* BOTÓN OFICIAL: VER OPs POR HACER (DISEÑO CORPORATIVO Y ELEGANTE) */}
            <button
              type="button"
              onClick={() => setShowTableModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 text-black font-mono font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 duration-150 whitespace-nowrap"
            >
              <Table className="w-4 h-4 fill-black text-black shrink-0" />
              <span>VER OPs POR HACER</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-black font-black text-[11px] font-mono">
                {opsWithNumber.length > 0 ? opsWithNumber.length : monitoreoList.length}
              </span>
            </button>
          </div>

        </div>

        {/* Predictive Search Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Escribe N° de OP (Ej: OP-122564, OP-669), Tela, Referencia o Cód. MT..."
              className="w-full bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 hover:border-zinc-700 dark:hover:border-zinc-300 focus:border-emerald-500 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none transition shadow-inner font-mono"
            />
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-4 pointer-events-none" />
            
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                }}
                className="absolute right-3 text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-950 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown Options */}
          {isOpen && query.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-2xl shadow-2xl z-40 max-h-64 overflow-y-auto custom-scroll divide-y divide-zinc-800 dark:divide-zinc-200 text-white dark:text-zinc-950">
              {filtered.length === 0 ? (
                <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600 text-center font-mono">
                  No se encontraron OPs pendientes en Monitoreo que coincidan.
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectOp(item);
                      setQuery(item.op ? `${item.op} - ${item.tela}` : item.tela);
                      setIsOpen(false);
                    }}
                    className="p-3.5 hover:bg-zinc-900/80 dark:hover:bg-zinc-100 cursor-pointer transition flex items-center justify-between text-xs gap-2 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {item.op ? (
                          <span className="font-mono font-black text-amber-400 dark:text-amber-600 group-hover:text-amber-300">
                            {item.op}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 bg-zinc-900 dark:bg-zinc-200 px-2 py-0.5 rounded border border-zinc-800 dark:border-zinc-300">
                            POR ASIGNAR
                          </span>
                        )}
                        <span className="text-white dark:text-zinc-950 font-bold">{item.tela}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                        {item.referencia && <>Ref: <strong className="text-white dark:text-zinc-950">{item.referencia}</strong> • </>}Color: <strong className="text-zinc-200 dark:text-zinc-800">{item.color}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.5 rounded border border-zinc-800 dark:border-zinc-300">
                        {item.mt}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* MODAL: VER TODAS LAS OPS POR HACER (HOJA MONITOREO) */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
          <div className="bg-[#0c1017] dark:bg-white border-2 border-emerald-500/70 rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-white dark:text-zinc-950">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 dark:border-zinc-200 bg-gradient-to-r from-emerald-950/70 via-[#0c1017] to-emerald-950/70 dark:from-emerald-50 dark:via-white dark:to-emerald-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 dark:text-emerald-700 shrink-0">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500 text-black text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                      HOJA MONITOREO
                    </span>
                    <span className="text-xs text-zinc-300 dark:text-zinc-700 font-bold font-mono">
                      {opsWithNumber.length} OPs Asignadas • {monitoreoList.length} Registros
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white dark:text-zinc-950 brand-title mt-0.5">
                    Listado Maestro de OPs por Hacer
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600">
                    Al seleccionar y registrar una OP, esta se eliminará automáticamente de la hoja <strong>MONITOREO</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/50 dark:bg-zinc-50">
              <div className="relative">
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Buscar en Monitoreo por N° de OP, Tela, Referencia o Código MT..."
                  className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-y-auto flex-1 custom-scroll p-4">
              <table className="w-full text-left text-xs text-zinc-300 dark:text-zinc-700">
                <thead className="bg-zinc-900 dark:bg-zinc-100 text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3 rounded-l-xl">OP</th>
                    <th className="p-3">Tela Textil STF</th>
                    <th className="p-3">Código MT</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Referencia</th>
                    <th className="p-3 rounded-r-xl text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 dark:divide-zinc-200 font-medium">
                  {modalFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs font-mono">
                        No se encontraron registros en la hoja de Monitoreo.
                      </td>
                    </tr>
                  ) : (
                    modalFiltered.map((item, i) => (
                      <tr key={i} className="hover:bg-zinc-900/80 dark:hover:bg-zinc-100 transition group font-mono">
                        <td className="p-3 font-bold">
                          {item.op ? (
                            <span className="font-black text-amber-400 dark:text-amber-600 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                              {item.op}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-zinc-400 dark:text-zinc-600 font-mono">
                              Por asignar
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white dark:text-zinc-950 font-sans">{item.tela}</td>
                        <td className="p-3 text-zinc-300 dark:text-zinc-600 font-bold">{item.mt}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 font-bold text-xs">
                            <span className={`w-2 h-2 rounded-full ${item.color === 'AZUL' ? 'bg-blue-500' : 'bg-amber-400'}`}></span>
                            {item.color}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-300 dark:text-zinc-700">
                          {item.referencia ? (
                            <strong className="text-white dark:text-zinc-950">{item.referencia}</strong>
                          ) : (
                            <span className="text-zinc-500 italic text-[11px] font-sans">Pendiente</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectOp(item);
                              setShowTableModal(false);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black transition cursor-pointer shadow-sm hover:scale-105 active:scale-95 uppercase tracking-wide"
                          >
                            Cargar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 font-mono">
              <span>Mostrando {modalFiltered.length} de {monitoreoList.length} filas en Monitoreo</span>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 rounded-xl font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
