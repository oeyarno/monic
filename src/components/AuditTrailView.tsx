import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ChangeDocument } from '../types/sap.ts';
import { formatDateTime } from '../utils/format.ts';

interface AuditTrailViewProps {
  changeDocuments: ChangeDocument[];
  onOpenMaterial: (matnr: string) => void;
}

export function AuditTrailView({ changeDocuments, onOpenMaterial }: AuditTrailViewProps) {
  const [filterClass, setFilterClass] = useState<'ALL' | 'MATERIAL' | 'MM_DOC' | 'CUSTOMIZING'>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return changeDocuments.filter((doc) => {
      if (filterClass !== 'ALL' && doc.objectClass !== filterClass) return false;
      if (!q) return true;
      return (
        doc.objectId.toLowerCase().includes(q) ||
        doc.fieldName.toLowerCase().includes(q) ||
        doc.tableName.toLowerCase().includes(q) ||
        doc.username.toLowerCase().includes(q)
      );
    });
  }, [changeDocuments, filterClass, query]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(
            [
              { id: 'ALL', label: 'Semua Log' },
              { id: 'MATERIAL', label: 'Material Master (MM01/02)' },
              { id: 'MM_DOC', label: 'Dokumen MM (ME/MIGO)' },
              { id: 'CUSTOMIZING', label: 'Kustomisasi (OMS9)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterClass(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterClass === tab.id ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari objek, tabel, field, user..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9] focus:bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            CDHDR / CDPOS · Audit Trail &amp; Change Documents
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan perubahan field tingkat tabel SAP (MARA, MARC, MBEW, MARD, CI_MARA, EKKO, T137)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Change Doc</th>
                <th className="py-2.5 px-4">Kelas / Objek</th>
                <th className="py-2.5 px-4">Tabel &amp; Field</th>
                <th className="py-2.5 px-4">Nilai Lama (Old)</th>
                <th className="py-2.5 px-4">Nilai Baru (New)</th>
                <th className="py-2.5 px-4">User &amp; Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((row) => (
                <tr key={row.changenr} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {row.changenr}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-[11px] text-slate-500 font-mono">{row.objectClass}</div>
                    {row.objectClass === 'MATERIAL' ? (
                      <button
                        type="button"
                        onClick={() => onOpenMaterial(row.objectId)}
                        className="font-mono font-semibold text-[#0064D9] hover:underline"
                      >
                        {row.objectId}
                      </button>
                    ) : (
                      <span className="font-mono font-semibold text-slate-900">{row.objectId}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-[11px] text-slate-500">{row.tableName}</div>
                    <div className="font-medium text-slate-900">{row.fieldName}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 max-w-[180px] truncate">
                    {row.oldValue}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-700 font-medium max-w-[220px] truncate">
                    {row.newValue}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-800">{row.username}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {formatDateTime(row.timestamp)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
