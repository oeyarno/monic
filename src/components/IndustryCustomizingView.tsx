import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Save,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  CustomFieldDataType,
  CustomIndustryField,
  FieldStatus,
  IndustrySectorCode,
  SapBootstrapPayload,
  StandardFieldRule,
} from '../types/sap.ts';

interface IndustryCustomizingViewProps {
  data: SapBootstrapPayload;
  initialIndustry?: IndustrySectorCode;
  onSaveStandardRules: (rules: StandardFieldRule[]) => Promise<{ ok: boolean; error?: string }>;
  onCreateCustomField: (field: CustomIndustryField) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCustomField: (field: CustomIndustryField) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCustomField: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const STATUS_OPTIONS: { value: FieldStatus; label: string }[] = [
  { value: 'required', label: 'Required (Wajib)' },
  { value: 'optional', label: 'Optional' },
  { value: 'display', label: 'Display (Read-Only)' },
  { value: 'hide', label: 'Hide (Sembunyikan)' },
];

export function IndustryCustomizingView({
  data,
  initialIndustry,
  onSaveStandardRules,
  onCreateCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
}: IndustryCustomizingViewProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<IndustrySectorCode>(
    initialIndustry || 'C'
  );
  const [activeSubTab, setActiveSubTab] = useState<'oms9' | 'append'>('oms9');
  const [rulesDraft, setRulesDraft] = useState<StandardFieldRule[]>(() =>
    structuredClone(data.standardFieldRules)
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // New CI_MARA custom field form
  const [newFieldName, setNewFieldName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDataType, setNewDataType] = useState<CustomFieldDataType>('text');
  const [newUnit, setNewUnit] = useState('');
  const [newOptionsRaw, setNewOptionsRaw] = useState('');
  const [newHelpText, setNewHelpText] = useState('');
  const [newStatus, setNewStatus] = useState<FieldStatus>('required');

  useEffect(() => {
    setRulesDraft(structuredClone(data.standardFieldRules));
  }, [data.standardFieldRules]);

  useEffect(() => {
    if (initialIndustry) {
      setSelectedIndustry(initialIndustry);
    }
  }, [initialIndustry]);

  const industryDef = data.industrySectors.find((i) => i.mbrsh === selectedIndustry);
  const industryFields = data.customIndustryFields.filter(
    (f) => f.industrySector === selectedIndustry
  );

  const handleRuleChange = (fieldKey: string, nextStatus: FieldStatus) => {
    setRulesDraft((prev) =>
      prev.map((rule) =>
        rule.fieldKey === fieldKey
          ? {
              ...rule,
              rulesByIndustry: {
                ...rule.rulesByIndustry,
                [selectedIndustry]: nextStatus,
              },
            }
          : rule
      )
    );
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanName = newFieldName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const finalName = cleanName.startsWith('ZZ_') ? cleanName : `ZZ_${cleanName}`;

    const field: CustomIndustryField = {
      id: '',
      fieldName: finalName,
      label: newLabel.trim(),
      industrySector: selectedIndustry,
      targetView: 'industry',
      dataType: newDataType,
      unit: newDataType === 'number' && newUnit.trim() ? newUnit.trim() : undefined,
      options:
        newDataType === 'select'
          ? newOptionsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      helpText: newHelpText.trim() || `Atribut khusus sektor industri ${industryDef?.label}`,
      status: newStatus,
    };

    const res = await onCreateCustomField(field);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Field ${finalName} ditambahkan ke struktur CI_MARA sektor ${selectedIndustry} dan langsung aktif di MM01/MM02.`,
      });
      setNewFieldName('');
      setNewLabel('');
      setNewUnit('');
      setNewOptionsRaw('');
      setNewHelpText('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menambah field kustom.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Industry Sector Selector Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              SPRO Customizing · OMS9 Field Selection &amp; Append Structure CI_MARA
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi aturan field standar SAP (Required/Optional/Display/Hide) serta field kustom spesifik per Industry Sector (T137).
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab('oms9')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'oms9' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Field Status (OMS9)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('append')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'append' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Append Field Builder (CI_MARA)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {data.industrySectors.map((ind) => {
            const isSelected = ind.mbrsh === selectedIndustry;
            const customCount = data.customIndustryFields.filter(
              (f) => f.industrySector === ind.mbrsh
            ).length;
            return (
              <button
                key={ind.mbrsh}
                type="button"
                onClick={() => {
                  setSelectedIndustry(ind.mbrsh);
                  setFeedback(null);
                }}
                className={`p-3 rounded-md border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#EAF2FD] border-[#0064D9] text-[#0064D9]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="font-mono text-xs font-bold">MBRSH · {ind.mbrsh}</div>
                <div className="text-xs font-semibold mt-0.5 truncate">{ind.shortLabel}</div>
                <div className="text-[11px] text-slate-500 mt-1">{customCount} field CI_MARA</div>
              </button>
            );
          })}
        </div>

        {industryDef && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{industryDef.label}:</span>{' '}
            {industryDef.regulatoryContext}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-lg p-3.5 border flex items-center gap-2 text-xs font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SUBTAB 1: OMS9 STANDARD FIELD MATRIX */}
      {activeSubTab === 'oms9' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                OMS9 Field Reference Matrix — Sektor {selectedIndustry} ({industryDef?.shortLabel})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perubahan status langsung mengontrol visibilitas, read-only, dan validasi wajib isi di MM01/MM02.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await onSaveStandardRules(rulesDraft);
                setFeedback(
                  res.ok
                    ? { type: 'ok', text: `Matriks OMS9 untuk sektor ${selectedIndustry} berhasil disimpan dan aktif.` }
                    : { type: 'err', text: res.error || 'Gagal menyimpan matriks OMS9.' }
                );
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Aturan OMS9</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-5">Technical Field</th>
                  <th className="py-2.5 px-5">Tabel / View MM01</th>
                  <th className="py-2.5 px-5">Nama Field</th>
                  <th className="py-2.5 px-5">Status di Sektor {selectedIndustry}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rulesDraft.map((rule) => {
                  const currentStatus = rule.rulesByIndustry[selectedIndustry];
                  return (
                    <tr key={rule.fieldKey} className="hover:bg-slate-50">
                      <td className="py-3 px-5 font-mono font-semibold text-slate-900">
                        {rule.technicalName}
                      </td>
                      <td className="py-3 px-5 font-mono text-slate-600">
                        {rule.tableName} · {rule.viewKey}
                      </td>
                      <td className="py-3 px-5 text-slate-800 font-medium">{rule.label}</td>
                      <td className="py-3 px-5">
                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleRuleChange(rule.fieldKey, opt.value)}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                                currentStatus === opt.value
                                  ? opt.value === 'required'
                                    ? 'bg-red-600 text-white'
                                    : opt.value === 'hide'
                                    ? 'bg-slate-700 text-white'
                                    : opt.value === 'display'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white text-[#0064D9] shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: APPEND STRUCTURE CI_MARA BUILDER */}
      {activeSubTab === 'append' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateField}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0064D9]" />
              <h3 className="text-sm font-semibold text-slate-900">
                Tambah Field Append CI_MARA ({selectedIndustry})
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Technical Field Name (Namespace ZZ_*)
              </label>
              <input
                type="text"
                required
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value.toUpperCase())}
                placeholder="mis. ZZ_MSDS_NUMBER atau ZZ_SNI_CODE"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Label Tampilan UI</label>
              <input
                type="text"
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="mis. Nomor Lembar Data Keselamatan (MSDS)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipe Data</label>
                <select
                  value={newDataType}
                  onChange={(e) => setNewDataType(e.target.value as CustomFieldDataType)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                >
                  <option value="text">Text (CHAR)</option>
                  <option value="number">Number (DEC/QUAN)</option>
                  <option value="select">Dropdown (Check Table)</option>
                  <option value="boolean">Checkbox (XFELD)</option>
                  <option value="date">Date (DATS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status OMS9</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as FieldStatus)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {newDataType === 'number' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Pengukuran (Opsional)</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="mis. °C, %, mg/kg, bar"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md"
                />
              </div>
            )}

            {newDataType === 'select' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Opsi Nilai Validasi (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  required
                  value={newOptionsRaw}
                  onChange={(e) => setNewOptionsRaw(e.target.value)}
                  placeholder="Grade A, Grade B, Teknis"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Dokumentasi / F1 Help Text</label>
              <input
                type="text"
                value={newHelpText}
                onChange={(e) => setNewHelpText(e.target.value)}
                placeholder="Penjelasan penggunaan field bagi user MM01/MM02"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan ke Struktur CI_MARA</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Field Kustom CI_MARA — Sektor {selectedIndustry} ({industryFields.length})
              </h3>
            </div>
            {industryFields.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada field kustom CI_MARA untuk sektor industri {selectedIndustry}.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {industryFields.map((cf) => (
                  <div key={cf.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0064D9]">{cf.fieldName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-semibold text-slate-900">{cf.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Tipe: <span className="font-mono">{cf.dataType}</span>
                        {cf.unit ? ` (${cf.unit})` : ''}
                        {cf.options && cf.options.length > 0 ? ` · Opsi: ${cf.options.join(', ')}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{cf.helpText}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={cf.status}
                        onChange={(e) =>
                          onUpdateCustomField({ ...cf, status: e.target.value as FieldStatus })
                        }
                        aria-label={`Status untuk ${cf.fieldName}`}
                        className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomField(cf.id)}
                        title="Hapus field kustom"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
