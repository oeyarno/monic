import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardPlus,
  Download,
  Search,
  Upload,
  Warehouse,
  XCircle,
} from 'lucide-react';
import type {
  IndustrySectorCode,
  MaterialMasterRecord,
  MaterialTypeCode,
  SapBootstrapPayload,
  ValuationTypeCode,
} from '../types/sap.ts';
import { formatCurrency, formatNumber, getMaterialStatusLabel } from '../utils/format.ts';

interface MaterialListViewProps {
  data: SapBootstrapPayload;
  onOpenMaterial: (matnr: string, mode: 'edit' | 'view') => void;
  onCreatePrForMaterial: (matnr: string, werks: string) => void;
  onOpenStockOverview: (matnr: string) => void;
  onCreateNewMaterial: () => void;
  onImported: (payload: SapBootstrapPayload) => void;
}

export function MaterialListView({
  data,
  onOpenMaterial,
  onCreatePrForMaterial,
  onOpenStockOverview,
  onCreateNewMaterial,
  onImported,
}: MaterialListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<'ALL' | IndustrySectorCode>('ALL');
  const [selectedBklas, setSelectedBklas] = useState<'ALL' | string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | MaterialTypeCode>('ALL');
  const [selectedPlant, setSelectedPlant] = useState<'ALL' | string>('ALL');
  const [templateMatkl, setTemplateMatkl] = useState<string>(data.materialGroups[0]?.matkl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const kpis = useMemo(() => {
    let totalInventoryValue = 0;
    let belowReorderCount = 0;

    for (const mat of data.materials) {
      const valSum = Object.values(mat.mbew).reduce((acc, m) => acc + m.salk3, 0);
      totalInventoryValue += valSum;

      const isLow = Object.entries(mat.marc).some(([werks, marc]) => {
        const plantStock = Object.values(mat.mard)
          .filter((s) => s.werks === werks)
          .reduce((acc, s) => acc + s.labst, 0);
        return marc.minbe > 0 && plantStock < marc.minbe;
      });
      if (isLow) belowReorderCount += 1;
    }

    const openPoCount = data.purchaseOrders.filter((po) => po.status !== 'Completed').length;
    return {
      totalMaterials: data.materials.length,
      totalInventoryValue,
      belowReorderCount,
      openPoCount,
    };
  }, [data]);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.materials.filter((mat) => {
      if (selectedIndustry !== 'ALL' && mat.mara.mbrsh !== selectedIndustry) return false;
      if (selectedType !== 'ALL' && mat.mara.mtart !== selectedType) return false;
      if (selectedPlant !== 'ALL' && !mat.marc[selectedPlant]) return false;
      if (selectedBklas !== 'ALL') {
        const hasBklas = Object.values(mat.mbew).some((m) => m.bklas === selectedBklas);
        if (!hasBklas) return false;
      }
      if (!q) return true;
      return (
        mat.mara.matnr.toLowerCase().includes(q) ||
        mat.mara.maktx.toLowerCase().includes(q) ||
        mat.mara.matkl.toLowerCase().includes(q) ||
        mat.mara.bismt.toLowerCase().includes(q)
      );
    });
  }, [data.materials, searchQuery, selectedIndustry, selectedBklas, selectedType, selectedPlant]);

  const getMaterialSummary = (mat: MaterialMasterRecord) => {
    const plants = selectedPlant === 'ALL' ? Object.keys(mat.marc) : [selectedPlant].filter((p) => mat.marc[p]);
    const stockTotal = Object.values(mat.mard)
      .filter((s) => selectedPlant === 'ALL' || s.werks === selectedPlant)
      .reduce((sum, s) => sum + s.labst, 0);

    const minReorder = plants.reduce((sum, w) => sum + (mat.marc[w]?.minbe || 0), 0);
    const totalValue = Object.values(mat.mbew)
      .filter((v) => selectedPlant === 'ALL' || v.bwkey === selectedPlant)
      .reduce((sum, v) => sum + v.salk3, 0);

    const primaryMbew = selectedPlant !== 'ALL' ? mat.mbew[selectedPlant] : Object.values(mat.mbew)[0];
    const unitPrice = primaryMbew ? (primaryMbew.vprsv === 'V' ? primaryMbew.verpr : primaryMbew.stprs) : 0;
    const priceCtrl = primaryMbew?.vprsv || 'V';
    const bklas = primaryMbew?.bklas || '3000';
    const waers = primaryMbew?.waers || 'IDR';
    const isBelowRop = minReorder > 0 && stockTotal < minReorder;
    const primaryPlant = plants[0] || Object.keys(mat.marc)[0] || data.plants[0]?.werks || '1000';
    const bwtty = primaryMbew?.bwtty || '';
    const splitTypes: ValuationTypeCode[] = [];
    const relevantMbew = Object.values(mat.mbew).filter(
      (v) => selectedPlant === 'ALL' || v.bwkey === selectedPlant
    );
    for (const v of relevantMbew) {
      if (v.bwtty && v.splitValuations) {
        for (const key of Object.keys(v.splitValuations) as ValuationTypeCode[]) {
          if (v.splitValuations[key] && !splitTypes.includes(key)) {
            splitTypes.push(key);
          }
        }
      }
    }

    return {
      plants,
      stockTotal,
      minReorder,
      totalValue,
      unitPrice,
      priceCtrl,
      bklas,
      waers,
      isBelowRop,
      primaryPlant,
      bwtty,
      splitTypes,
    };
  };

  const downloadTemplate = () => {
    const group = data.materialGroups.find((item) => item.matkl === templateMatkl);
    if (!group) {
      setImportMessage({ type: 'error', text: 'Pilih Material Group terlebih dahulu.' });
      return;
    }
    const headers = [
      'MATNR',
      'MAKTX',
      'MEINS',
      'BISMT',
      ...group.characteristics
        .filter((char) => char.required)
        .map((char) => char.charName),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      ['', 'Contoh Nama Material', data.unitsOfMeasure[0]?.msehi || 'EA', 'Kode lama', ...group.characteristics.filter((char) => char.required).map((char) => char.options?.[0] || '')],
    ]);
    worksheet['!cols'] = headers.map((header) => ({
      wch: Math.max(header.length + 4, 18),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Master');
    XLSX.writeFile(workbook, `Template_Material_${group.matkl}.xlsx`);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(xlsx?|csv)$/i.test(file.name)) {
      setImportMessage({ type: 'error', text: 'Format file harus XLS, XLSX, atau CSV.' });
      return;
    }
    setImporting(true);
    setImportMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('File tidak memiliki worksheet.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        defval: '',
        raw: false,
      });
      if (rows.length === 0) throw new Error('Worksheet tidak berisi data material.');

      const response = await fetch('/api/materials/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': data.activeTenant.tenantId,
        },
        body: JSON.stringify({ rows, matkl: templateMatkl, username: 'SAP_IMPORT_XLS' }),
      });
      const result = await response.json();
      if (!response.ok && !result.db) {
        throw new Error(result.error || 'Impor material gagal.');
      }
      if (result.db) onImported(result.db);

      const errorCount = result.errors?.length || 0;
      if (errorCount > 0) {
        const first = result.errors[0];
        setImportMessage({
          type: 'warning',
          text: `${result.created?.length || 0} dibuat, ${result.updated?.length || 0} diperbarui, ${errorCount} baris gagal. Baris ${first.row}: ${first.errors?.[0] || 'validasi gagal.'}`,
        });
      } else {
        setImportMessage({
          type: 'success',
          text: `${result.created?.length || 0} material dibuat dan ${result.updated?.length || 0} diperbarui.`,
        });
      }
    } catch (error) {
      setImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Gagal membaca atau mengimpor file.',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip - Flat Single Elevation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Total Material Master (MARA)</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {kpis.totalMaterials}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {data.materialGroups.length} Material Group T023 · HAWA / Sektor {data.activeTenant.defaultIndustry}
            {' · '}{(data.corporateMaraMaterials || []).length} MARA dibagikan korporat
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Total Nilai Persediaan (MBEW-SALK3)</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(kpis.totalInventoryValue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Valuasi real-time lintas plant
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Di Bawah Reorder Point (MINBE)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                kpis.belowReorderCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {kpis.belowReorderCount}
            </span>
            <span className="text-xs text-slate-500">material butuh PR</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Pemicu pengadaan otomatis MM
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Purchase Order Terbuka (ME21N)</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {kpis.openPoCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Menunggu penerimaan MIGO 101
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Material Number (MATNR), Deskripsi (MAKTX), Legacy Code..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0064D9] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'ALL' | MaterialTypeCode)}
              aria-label="Filter Material Type"
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-[#0064D9]"
            >
              <option value="ALL">Semua Material Type (MTART)</option>
              {data.materialTypes.map((mt) => (
                <option key={mt.mtart} value={mt.mtart}>
                  {mt.mtart} · {mt.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              aria-label="Filter Plant"
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-[#0064D9]"
            >
              <option value="ALL">Semua Plant (WERKS)</option>
              {data.plants.map((p) => (
                <option key={p.werks} value={p.werks}>
                  {p.werks} · {p.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Segmented Filter: Industry Sector if >1, otherwise Valuation Class (OMQW) */}
        {data.industrySectors.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setSelectedIndustry('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedIndustry === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Industri ({data.materials.length})
            </button>
            {data.industrySectors.map((ind) => {
              const count = data.materials.filter((m) => m.mara.mbrsh === ind.mbrsh).length;
              return (
                <button
                  key={ind.mbrsh}
                  type="button"
                  onClick={() => setSelectedIndustry(ind.mbrsh)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedIndustry === ind.mbrsh
                      ? 'bg-white text-[#0064D9] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ind.shortLabel} ({count})
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setSelectedBklas('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedBklas === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua HAWA ({data.materials.length})
            </button>
            {[
              { code: '3500', label: '3500 Unit' },
              { code: '3040', label: '3040 Spare Parts' },
              { code: '3030', label: '3030 Ops / GA / IT' },
              { code: '3100', label: '3100 Trading / Tools' },
              { code: '3200', label: '3200 Services' },
              { code: '3000', label: '3000 Raw / Project' },
            ].map((vc) => {
              const count = data.materials.filter((m) =>
                Object.values(m.mbew).some((mb) => mb.bklas === vc.code)
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={vc.code}
                  type="button"
                  onClick={() => setSelectedBklas(vc.code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedBklas === vc.code
                      ? 'bg-white text-[#0064D9] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {vc.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* High-Density SAP ALV Material Master Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              MM60 · Daftar Material Master &amp; Valuasi Plant ({data.activeTenant.bukrs})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {data.activeTenant.name} · {data.activeTenant.coreBusiness} · Menampilkan {filteredMaterials.length} dari {data.materials.length} material
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={templateMatkl}
              onChange={(event) => setTemplateMatkl(event.target.value)}
              aria-label="Material Group untuk template XLS"
              className="max-w-[220px] px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700"
            >
              {data.materialGroups.map((group) => (
                <option key={group.matkl} value={group.matkl}>
                  {group.matkl} · {group.label}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              Template XLS
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0064D9] hover:bg-[#0052B4] disabled:opacity-60 rounded-md"
            >
              <Upload className="w-3.5 h-3.5" />
              {importing ? 'Mengimpor...' : 'Import XLS'}
            </button>
          </div>
        </div>
        {importMessage && (
          <div
            className={`mx-4 mt-3 mb-1 px-3 py-2 rounded-md text-xs border ${
              importMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : importMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {importMessage.text}
          </div>
        )}

        {filteredMaterials.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-semibold text-slate-900">Tidak ada material yang cocok</div>
            <p className="text-xs text-slate-500 mt-1">
              Ubah kata kunci pencarian atau filter sektor industri, atau buat material baru via MM01.
            </p>
            <button
              type="button"
              onClick={onCreateNewMaterial}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
            >
              Buat Material Baru (MM01)
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4 whitespace-nowrap">Material (MATNR)</th>
                  <th className="py-2.5 px-4">Deskripsi &amp; Klasifikasi</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Plant / Val. Class</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Stok Unrestricted</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Harga (V/S)</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Nilai Stok (SALK3)</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Status &amp; MRP</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredMaterials.map((mat) => {
                  const summary = getMaterialSummary(mat);
                  const statusInfo = getMaterialStatusLabel(mat.mara.mstae);
                  const indName =
                    data.industrySectors.find((i) => i.mbrsh === mat.mara.mbrsh)?.shortLabel ||
                    mat.mara.mbrsh;

                  const matGroup = (data.materialGroups || []).find((mg) => mg.matkl === mat.mara.matkl);
                  const charSummary = (matGroup?.characteristics || [])
                    .map((ch) => {
                      const val = mat.characteristics?.[ch.charName];
                      if (val === undefined || val === null || val === '') return null;
                      return `${val}${ch.unit ? ` ${ch.unit}` : ''}`;
                    })
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(' · ');

                  return (
                    <tr
                      key={mat.mara.matnr}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenMaterial(mat.mara.matnr, 'edit')}
                          className="font-mono font-semibold text-[#0064D9] hover:underline tabular-nums"
                        >
                          {mat.mara.matnr}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {mat.mara.mtart} · {mat.mara.meins}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-medium text-slate-900 leading-snug">
                          {mat.mara.maktx}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                          <span>{indName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{mat.mara.matkl}</span>
                          {mat.mara.xchpf && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Batch Managed</span>
                            </>
                          )}
                        </div>
                        {charSummary && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate" title={charSummary}>
                            {charSummary}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap font-mono text-slate-700">
                        <div>Plant {summary.plants.join(', ') || '-'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          BKLAS {summary.bklas} · {summary.priceCtrl === 'V' ? 'MAP (V)' : 'Std (S)'}
                        </div>
                        {summary.bwtty && summary.splitTypes.length > 0 && (
                          <div className="text-[11px] text-[#0064D9] mt-0.5">
                            Split ({summary.bwtty}): {summary.splitTypes.join('/')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatNumber(summary.stockTotal)} {mat.mara.meins}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ROP: {formatNumber(summary.minReorder)} {mat.mara.meins}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums text-slate-800">
                        {formatCurrency(summary.unitPrice, summary.waers)}
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums font-medium text-slate-900">
                        {formatCurrency(summary.totalValue, summary.waers)}
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {statusInfo.tone === 'nominal' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          {statusInfo.tone === 'warning' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          {statusInfo.tone === 'danger' && (
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          )}
                          <span
                            className={
                              statusInfo.tone === 'danger'
                                ? 'text-red-700 font-medium'
                                : statusInfo.tone === 'warning'
                                ? 'text-amber-700 font-medium'
                                : 'text-slate-700'
                            }
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        {summary.isBelowRop && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Stok di bawah ROP</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenMaterial(mat.mara.matnr, 'edit')}
                            title="Kelola di MM02"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0064D9] hover:text-[#0064D9] rounded-md transition-colors"
                          >
                            <span>MM02</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCreatePrForMaterial(mat.mara.matnr, summary.primaryPlant)}
                            title="Buat Purchase Requisition (ME51N)"
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:text-slate-900 rounded-md transition-colors"
                          >
                            <ClipboardPlus className="w-3.5 h-3.5" />
                            <span>PR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenStockOverview(mat.mara.matnr)}
                            title="Lihat Stock Overview (MMBE)"
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:text-slate-900 rounded-md transition-colors"
                          >
                            <Warehouse className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
