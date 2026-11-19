import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import type { MovementTypeCode, PurchaseRequisition, SapBootstrapPayload } from '../types/sap.ts';
import { formatCurrency, formatNumber } from '../utils/format.ts';

interface MmIntegrationViewProps {
  data: SapBootstrapPayload;
  activeTab: 'me51n' | 'me21n' | 'migo' | 'mmbe';
  preselectedMatnr?: string;
  preselectedWerks?: string;
  onTabChange: (tab: 'me51n' | 'me21n' | 'migo' | 'mmbe') => void;
  onOpenMaterial: (matnr: string) => void;
  onCreatePr: (payload: {
    matnr: string;
    werks: string;
    lgort: string;
    menge: number;
    lfdat: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onConvertPrToPo: (
    banfn: string,
    payload: { lifnr: string; netpr: number; eindt: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onCreatePo: (payload: {
    lifnr: string;
    matnr: string;
    werks: string;
    lgort: string;
    menge: number;
    netpr: number;
    eindt: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onPostMigo: (payload: {
    bwart: MovementTypeCode;
    matnr: string;
    werks: string;
    lgort: string;
    targetLgort?: string;
    ebeln?: string;
    kostl?: string;
    menge: number;
    bktxt?: string;
  }) => Promise<{ ok: boolean; error?: string; docNumber?: string }>;
}

export function MmIntegrationView({
  data,
  activeTab,
  preselectedMatnr,
  preselectedWerks,
  onTabChange,
  onOpenMaterial,
  onCreatePr,
  onConvertPrToPo,
  onCreatePo,
  onPostMigo,
}: MmIntegrationViewProps) {
  const defaultMatnr = preselectedMatnr || data.materials[0]?.mara.matnr || '';
  const [selectedMatnr, setSelectedMatnr] = useState(defaultMatnr);
  const [werks, setWerks] = useState(preselectedWerks || '1000');
  const [lgort, setLgort] = useState('0001');
  const [qty, setQty] = useState(100);
  const [dateInput, setDateInput] = useState('2026-11-30');
  const [lifnr, setLifnr] = useState(data.vendors[0]?.lifnr || 'V-100042');
  const [poPrice, setPoPrice] = useState(15000);

  // MIGO states
  const [bwart, setBwart] = useState<MovementTypeCode>('101');
  const [selectedEbeln, setSelectedEbeln] = useState(
    data.purchaseOrders.find((p) => p.status !== 'Completed')?.ebeln || ''
  );
  const [targetLgort, setTargetLgort] = useState('0002');
  const [kostl, setKostl] = useState('CC-PROD-100');
  const [bktxt, setBktxt] = useState('');

  // PR -> PO Conversion modal state
  const [convertingPr, setConvertingPr] = useState<PurchaseRequisition | null>(null);
  const [convertLifnr, setConvertLifnr] = useState(data.vendors[0]?.lifnr || 'V-100042');
  const [convertPrice, setConvertPrice] = useState(0);

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeMaterial = useMemo(
    () => data.materials.find((m) => m.mara.matnr === selectedMatnr) || data.materials[0],
    [data.materials, selectedMatnr]
  );

  // Sync preselection from Material Master / List
  useEffect(() => {
    if (preselectedMatnr) {
      setSelectedMatnr(preselectedMatnr);
      const m = data.materials.find((x) => x.mara.matnr === preselectedMatnr);
      if (m) {
        const firstW = preselectedWerks && m.marc[preselectedWerks] ? preselectedWerks : Object.keys(m.marc)[0] || '1000';
        setWerks(firstW);
        const firstS = Object.values(m.mard).find((s) => s.werks === firstW)?.lgort || '0001';
        setLgort(firstS);
        const mbew = m.mbew[firstW] || Object.values(m.mbew)[0];
        if (mbew) setPoPrice(mbew.vprsv === 'V' ? mbew.verpr : mbew.stprs);
      }
    }
  }, [preselectedMatnr, preselectedWerks, data.materials]);

  // Keep plant storage options valid
  const plantDef = data.plants.find((p) => p.werks === werks) || data.plants[0];

  // Auto-fill PO price when material changes
  const handleSelectMaterial = (matnr: string) => {
    setSelectedMatnr(matnr);
    const m = data.materials.find((x) => x.mara.matnr === matnr);
    if (m) {
      const firstW = Object.keys(m.marc)[0] || '1000';
      setWerks(firstW);
      const firstS = Object.values(m.mard).find((s) => s.werks === firstW)?.lgort || '0001';
      setLgort(firstS);
      const mbew = m.mbew[firstW] || Object.values(m.mbew)[0];
      if (mbew) setPoPrice(mbew.vprsv === 'V' ? mbew.verpr : mbew.stprs);
    }
  };

  // When selecting an Open PO in MIGO 101, auto-bind material, plant, storage, remaining qty
  const handleSelectPoForMigo = (ebeln: string) => {
    setSelectedEbeln(ebeln);
    const po = data.purchaseOrders.find((p) => p.ebeln === ebeln);
    if (po) {
      setSelectedMatnr(po.matnr);
      setWerks(po.werks);
      setLgort(po.lgort);
      setQty(Math.max(1, po.menge - po.receivedQty));
    }
  };

  // Live MIGO Stock & MAP Simulation
  const migoPreview = useMemo(() => {
    if (!activeMaterial) return null;
    const mardKey = `${werks}-${lgort}`;
    const currentStock = activeMaterial.mard[mardKey]?.labst || 0;
    const mbew = activeMaterial.mbew[werks] || Object.values(activeMaterial.mbew)[0];
    const currentLbkum = mbew?.lbkum || 0;
    const currentSalk3 = mbew?.salk3 || 0;
    const currentVerpr = mbew?.verpr || 0;
    const peinh = mbew?.peinh || 1;
    const waers = mbew?.waers || 'IDR';
    const vprsv = mbew?.vprsv || 'V';

    if (bwart === '101') {
      const po = data.purchaseOrders.find((p) => p.ebeln === selectedEbeln);
      const grPrice = po ? po.netpr / (po.peinh || 1) : currentVerpr;
      const dmbtr = Math.round(qty * grPrice);
      const afterStock = currentStock + qty;
      const afterLbkum = currentLbkum + qty;
      const afterSalk3 =
        vprsv === 'V' ? currentSalk3 + dmbtr : Math.round((afterLbkum * (mbew?.stprs || grPrice)) / peinh);
      const afterVerpr =
        vprsv === 'V' && afterLbkum > 0 ? Math.round((afterSalk3 / afterLbkum) * peinh) : currentVerpr;

      return {
        beforeStock: currentStock,
        afterStock,
        beforePrice: currentVerpr,
        afterPrice: afterVerpr,
        dmbtr,
        waers,
        vprsv,
      };
    }

    if (bwart === '201') {
      const unitP = vprsv === 'V' ? currentVerpr : mbew?.stprs || 0;
      return {
        beforeStock: currentStock,
        afterStock: currentStock - qty,
        beforePrice: currentVerpr,
        afterPrice: currentVerpr,
        dmbtr: Math.round((qty * unitP) / peinh),
        waers,
        vprsv,
      };
    }

    if (bwart === '311') {
      const unitP = vprsv === 'V' ? currentVerpr : mbew?.stprs || 0;
      return {
        beforeStock: currentStock,
        afterStock: currentStock - qty,
        beforePrice: currentVerpr,
        afterPrice: currentVerpr,
        dmbtr: Math.round((qty * unitP) / peinh),
        waers,
        vprsv,
      };
    }

    // 561
    const unitP = vprsv === 'V' ? currentVerpr : mbew?.stprs || 0;
    return {
      beforeStock: currentStock,
      afterStock: currentStock + qty,
      beforePrice: currentVerpr,
      afterPrice: currentVerpr,
      dmbtr: Math.round((qty * unitP) / peinh),
      waers,
      vprsv,
    };
  }, [activeMaterial, werks, lgort, bwart, qty, selectedEbeln, data.purchaseOrders]);

  const openPos = data.purchaseOrders.filter((p) => p.status !== 'Completed');

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs for MM Integration */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              onTabChange('me51n');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'me51n' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>ME51N · Purchase Req</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              onTabChange('me21n');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'me21n' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>ME21N · Purchase Order</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              onTabChange('migo');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'migo' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>MIGO · Goods Movement</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              onTabChange('mmbe');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'mmbe' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>MMBE · Stock Overview</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Alur Terintegrasi: Material Master (MARA/MARC) → PR (ME51N) → PO (ME21N) → GR/GI (MIGO) → Valuasi (MBEW)
        </div>
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

      {/* ME51N: PURCHASE REQUISITION */}
      {activeTab === 'me51n' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFeedback(null);
              const res = await onCreatePr({
                matnr: selectedMatnr,
                werks,
                lgort,
                menge: qty,
                lfdat: dateInput,
              });
              setSubmitting(false);
              setFeedback(
                res.ok
                  ? { type: 'ok', text: `Purchase Requisition untuk ${selectedMatnr} berhasil dibuat.` }
                  : { type: 'err', text: res.error || 'Gagal membuat PR.' }
              );
            }}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">ME51N · Buat Purchase Requisition</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menarik Purchasing Group, MRP Controller &amp; Valuation Price otomatis dari Material Master.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Material (MATNR)</label>
              <select
                value={selectedMatnr}
                onChange={(e) => handleSelectMaterial(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              >
                {data.materials.map((m) => (
                  <option key={m.mara.matnr} value={m.mara.matnr}>
                    {m.mara.matnr} — {m.mara.maktx.slice(0, 34)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plant (WERKS)</label>
                <select
                  value={werks}
                  onChange={(e) => setWerks(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {data.plants.map((p) => (
                    <option key={p.werks} value={p.werks}>
                      {p.werks} · {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage Loc (LGORT)</label>
                <select
                  value={lgort}
                  onChange={(e) => setLgort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {plantDef.storageLocations.map((s) => (
                    <option key={s.lgort} value={s.lgort}>
                      {s.lgort} · {s.lgobe.slice(0, 18)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity ({activeMaterial?.mara.meins})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Date (LFDAT)</label>
                <input
                  type="date"
                  required
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
            </div>

            {activeMaterial && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchasing Group:</span>
                  <span className="font-mono text-slate-900">
                    {activeMaterial.marc[werks]?.ekgrp || 'P01'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MRP Controller:</span>
                  <span className="font-mono text-slate-900">
                    {activeMaterial.marc[werks]?.dispo || 'M01'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimasi Nilai (MBEW):</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(
                      qty *
                        (activeMaterial.mbew[werks]?.vprsv === 'S'
                          ? activeMaterial.mbew[werks]?.stprs || 0
                          : activeMaterial.mbew[werks]?.verpr || 0)
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
            >
              {submitting ? 'Membuat PR...' : 'Simpan Purchase Requisition (ME51N)'}
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Purchase Requisition (EBAN)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">PR Number</th>
                    <th className="py-2.5 px-4">Material</th>
                    <th className="py-2.5 px-4">Plant / SLoc</th>
                    <th className="py-2.5 px-4 text-right">Qty</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.purchaseRequisitions.map((pr) => (
                    <tr key={pr.banfn} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                        {pr.banfn}
                        <div className="text-[11px] font-normal text-slate-500">Req: {pr.lfdat}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onOpenMaterial(pr.matnr)}
                          className="font-mono text-[#0064D9] hover:underline font-medium"
                        >
                          {pr.matnr}
                        </button>
                        <div className="text-slate-700 truncate max-w-[220px]">{pr.maktx}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {pr.werks} / {pr.lgort}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatNumber(pr.menge)} {pr.meins}
                      </td>
                      <td className="py-3 px-4">
                        {pr.status === 'Converted to PO' ? (
                          <span className="text-emerald-700 font-medium">
                            Converted · PO {pr.ebeln}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">{pr.status}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {pr.status !== 'Converted to PO' && (
                          <button
                            type="button"
                            onClick={() => {
                              setConvertingPr(pr);
                              setConvertPrice(pr.preis);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0064D9] hover:bg-[#0052B4] rounded transition-colors whitespace-nowrap"
                          >
                            <span>Konversi ke PO</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ME21N: PURCHASE ORDER */}
      {activeTab === 'me21n' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFeedback(null);
              const res = await onCreatePo({
                lifnr,
                matnr: selectedMatnr,
                werks,
                lgort,
                menge: qty,
                netpr: poPrice,
                eindt: dateInput,
              });
              setSubmitting(false);
              setFeedback(
                res.ok
                  ? { type: 'ok', text: `Purchase Order untuk ${selectedMatnr} berhasil diterbitkan (ME21N).` }
                  : { type: 'err', text: res.error || 'Gagal menerbitkan PO.' }
              );
            }}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">ME21N · Buat Purchase Order</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Terbitkan PO ke Vendor. Harga kontrak mempengaruhi Moving Average Price saat MIGO 101.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Vendor (LIFNR)</label>
              <select
                value={lifnr}
                onChange={(e) => setLifnr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              >
                {data.vendors.map((v) => (
                  <option key={v.lifnr} value={v.lifnr}>
                    {v.lifnr} · {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Material (MATNR)</label>
              <select
                value={selectedMatnr}
                onChange={(e) => handleSelectMaterial(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              >
                {data.materials.map((m) => (
                  <option key={m.mara.matnr} value={m.mara.matnr}>
                    {m.mara.matnr} — {m.mara.maktx.slice(0, 34)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plant (WERKS)</label>
                <select
                  value={werks}
                  onChange={(e) => setWerks(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {data.plants.map((p) => (
                    <option key={p.werks} value={p.werks}>
                      {p.werks} · {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage Loc (LGORT)</label>
                <select
                  value={lgort}
                  onChange={(e) => setLgort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {plantDef.storageLocations.map((s) => (
                    <option key={s.lgort} value={s.lgort}>
                      {s.lgort} · {s.lgobe.slice(0, 18)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Order Qty ({activeMaterial?.mara.meins})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Net Price (NETPR)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={poPrice}
                  onChange={(e) => setPoPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Date (EINDT)</label>
              <input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Nilai PO:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {formatCurrency(qty * poPrice)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
            >
              {submitting ? 'Menyimpan PO...' : 'Terbitkan Purchase Order (ME21N)'}
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Purchase Order (EKKO / EKPO)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">PO Number</th>
                    <th className="py-2.5 px-4">Vendor &amp; Material</th>
                    <th className="py-2.5 px-4 text-right">Order / GR Qty</th>
                    <th className="py-2.5 px-4 text-right">Net Price</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.purchaseOrders.map((po) => (
                    <tr key={po.ebeln} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                        {po.ebeln}
                        <div className="text-[11px] font-normal text-slate-500">
                          {po.werks}/{po.lgort}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{po.vendorName}</div>
                        <div className="text-slate-600 mt-0.5">
                          <span className="font-mono text-[#0064D9]">{po.matnr}</span> · {po.maktx.slice(0, 32)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatNumber(po.receivedQty)} / {formatNumber(po.menge)} {po.meins}
                        </div>
                        <div className="text-[11px] text-slate-500">ETA {po.eindt}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatCurrency(po.netpr, po.waers)}
                      </td>
                      <td className="py-3 px-4">
                        {po.status === 'Completed' ? (
                          <span className="text-emerald-700 font-medium">Completed</span>
                        ) : po.status === 'Partially Received' ? (
                          <span className="text-amber-700 font-medium">Partially Received</span>
                        ) : (
                          <span className="text-[#0064D9] font-medium">Open</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setBwart('101');
                              handleSelectPoForMigo(po.ebeln);
                              onTabChange('migo');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0064D9] hover:bg-[#0052B4] rounded transition-colors whitespace-nowrap"
                          >
                            <span>GR (MIGO 101)</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MIGO: GOODS MOVEMENT */}
      {activeTab === 'migo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFeedback(null);
              const res = await onPostMigo({
                bwart,
                matnr: selectedMatnr,
                werks,
                lgort,
                targetLgort: bwart === '311' ? targetLgort : undefined,
                ebeln: bwart === '101' ? selectedEbeln : undefined,
                kostl: bwart === '201' ? kostl : undefined,
                menge: qty,
                bktxt,
              });
              setSubmitting(false);
              setFeedback(
                res.ok
                  ? {
                      type: 'ok',
                      text: `Material Document ${res.docNumber || ''} (MIGO ${bwart}) berhasil diposting! Stok MARD & Valuasi MBEW telah diperbarui.`,
                    }
                  : { type: 'err', text: res.error || 'Gagal memposting MIGO.' }
              );
            }}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">MIGO · Post Goods Movement</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menghasilkan Material Document (MKPF/MSEG), Accounting Doc (FI), dan update Moving Average Price (MBEW-VERPR).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Movement Type (BWART)</label>
              <select
                value={bwart}
                onChange={(e) => {
                  const nextB = e.target.value as MovementTypeCode;
                  setBwart(nextB);
                  if (nextB === '101' && openPos[0]) {
                    handleSelectPoForMigo(openPos[0].ebeln);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono font-medium bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              >
                <option value="101">101 — Goods Receipt for Purchase Order</option>
                <option value="201">201 — Goods Issue for Cost Center</option>
                <option value="311">311 — Transfer Posting Storage Location</option>
                <option value="561">561 — Initial Entry of Stock Balances</option>
              </select>
            </div>

            {bwart === '101' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reference Purchase Order (EBELN)
                </label>
                {openPos.length === 0 ? (
                  <div className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                    Tidak ada Purchase Order terbuka. Buat PO terlebih dahulu di menu ME21N.
                  </div>
                ) : (
                  <select
                    value={selectedEbeln}
                    onChange={(e) => handleSelectPoForMigo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="">-- Pilih Open PO --</option>
                    {openPos.map((po) => (
                      <option key={po.ebeln} value={po.ebeln}>
                        {po.ebeln} · {po.matnr} (Sisa {po.menge - po.receivedQty} {po.meins})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Material (MATNR)</label>
                <select
                  value={selectedMatnr}
                  onChange={(e) => handleSelectMaterial(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {data.materials.map((m) => (
                    <option key={m.mara.matnr} value={m.mara.matnr}>
                      {m.mara.matnr} — {m.mara.maktx.slice(0, 34)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plant (WERKS)</label>
                <select
                  value={werks}
                  disabled={bwart === '101'}
                  onChange={(e) => setWerks(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md disabled:bg-slate-100"
                >
                  {data.plants.map((p) => (
                    <option key={p.werks} value={p.werks}>
                      {p.werks} · {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {bwart === '311' ? 'From Storage Loc' : 'Storage Loc (LGORT)'}
                </label>
                <select
                  value={lgort}
                  onChange={(e) => setLgort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md"
                >
                  {plantDef.storageLocations.map((s) => (
                    <option key={s.lgort} value={s.lgort}>
                      {s.lgort} · {s.lgobe.slice(0, 16)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {bwart === '311' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To Storage Location (Target LGORT)
                </label>
                <select
                  value={targetLgort}
                  onChange={(e) => setTargetLgort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md"
                >
                  {plantDef.storageLocations.map((s) => (
                    <option key={s.lgort} value={s.lgort}>
                      {s.lgort} · {s.lgobe}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bwart === '201' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cost Center (KOSTL)</label>
                <input
                  type="text"
                  value={kostl}
                  onChange={(e) => setKostl(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity ({activeMaterial?.mara.meins})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Header Text (BKTXT)</label>
                <input
                  type="text"
                  value={bktxt}
                  onChange={(e) => setBktxt(e.target.value)}
                  placeholder="Catatan surat jalan..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                />
              </div>
            </div>

            {/* Real-Time Stock & Valuation Simulation Box */}
            {migoPreview && activeMaterial && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Simulasi Dampak Material Master</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok SLoc {werks}/{lgort}:</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatNumber(migoPreview.beforeStock)} →{' '}
                    <span className="font-bold text-[#0064D9]">
                      {formatNumber(migoPreview.afterStock)} {activeMaterial.mara.meins}
                    </span>
                  </span>
                </div>
                {bwart === '101' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {migoPreview.vprsv === 'V' ? 'Moving Avg Price (VERPR):' : 'Standard Price (STPRS):'}
                    </span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(migoPreview.beforePrice, migoPreview.waers)} →{' '}
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(migoPreview.afterPrice, migoPreview.waers)}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Nilai Dokumen Akuntansi (FI):</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(migoPreview.dmbtr, migoPreview.waers)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (bwart === '101' && !selectedEbeln)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] disabled:opacity-50 rounded-md transition-colors"
            >
              {submitting ? 'Memposting Dokumen...' : `Post Goods Movement (MIGO ${bwart})`}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                MB51 · Riwayat Material Document (MKPF / MSEG)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Mat. Doc / FI Doc</th>
                    <th className="py-2.5 px-4">Mvt</th>
                    <th className="py-2.5 px-4">Material &amp; Lokasi</th>
                    <th className="py-2.5 px-4 text-right">Qty</th>
                    <th className="py-2.5 px-4 text-right">Nilai (DMBTR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.materialDocuments.map((doc) => (
                    <tr key={doc.mblnr} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">{doc.mblnr}</div>
                        <div className="text-[11px] text-slate-500">
                          FI: {doc.belnr} · {doc.budat}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#0064D9]">
                        {doc.bwart}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900">
                          {doc.matnr} · {doc.werks}/{doc.lgort}
                          {doc.targetLgort ? ` → ${doc.targetLgort}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[230px]">
                          {doc.bktxt}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {doc.bwart === '201' ? '-' : '+'}
                        {formatNumber(doc.menge)} {doc.meins}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatCurrency(doc.dmbtr, doc.waers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MMBE: STOCK OVERVIEW */}
      {activeTab === 'mmbe' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                MMBE · Stock Overview (Client → Plant → Storage Location)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian stok Unrestricted (LABST), Quality Inspection (INSME), Blocked (SPEME), dan On-Order PO
              </p>
            </div>
            <select
              value={selectedMatnr}
              onChange={(e) => setSelectedMatnr(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md"
            >
              {data.materials.map((m) => (
                <option key={m.mara.matnr} value={m.mara.matnr}>
                  {m.mara.matnr} — {m.mara.maktx.slice(0, 38)}
                </option>
              ))}
            </select>
          </div>

          {activeMaterial && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                <div>
                  <div className="text-[11px] text-slate-500">Material</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {activeMaterial.mara.matnr}
                  </div>
                  <div className="text-xs text-slate-600 truncate">{activeMaterial.mara.maktx}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total Unrestricted</div>
                  <div className="font-mono font-bold text-slate-900 text-lg tabular-nums mt-0.5">
                    {formatNumber(
                      Object.values(activeMaterial.mard).reduce((a, b) => a + b.labst, 0)
                    )}{' '}
                    {activeMaterial.mara.meins}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">On-Order Stock (Open PO)</div>
                  <div className="font-mono font-bold text-[#0064D9] text-lg tabular-nums mt-0.5">
                    {formatNumber(
                      data.purchaseOrders
                        .filter((p) => p.matnr === activeMaterial.mara.matnr && p.status !== 'Completed')
                        .reduce((a, p) => a + (p.menge - p.receivedQty), 0)
                    )}{' '}
                    {activeMaterial.mara.meins}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total Inventory Value</div>
                  <div className="font-mono font-bold text-slate-900 text-lg tabular-nums mt-0.5">
                    {formatCurrency(
                      Object.values(activeMaterial.mbew).reduce((a, b) => a + b.salk3, 0)
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">Plant / Storage Location</th>
                      <th className="py-2.5 px-4">Bin (LGPBE)</th>
                      <th className="py-2.5 px-4 text-right">Unrestricted (LABST)</th>
                      <th className="py-2.5 px-4 text-right">Quality Insp (INSME)</th>
                      <th className="py-2.5 px-4 text-right">Blocked (SPEME)</th>
                      <th className="py-2.5 px-4 text-right">Valuasi (MAP / Std)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.values(activeMaterial.mard).map((s) => {
                      const mbew = activeMaterial.mbew[s.werks];
                      return (
                        <tr key={`${s.werks}-${s.lgort}`} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-mono font-semibold text-slate-900">
                              Plant {s.werks} · SLoc {s.lgort}
                            </div>
                            <div className="text-[11px] text-slate-500">{s.lgobe}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{s.lgpbe}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                            {formatNumber(s.labst)} {activeMaterial.mara.meins}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                            {formatNumber(s.insme)} {activeMaterial.mara.meins}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-red-700">
                            {formatNumber(s.speme)} {activeMaterial.mara.meins}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                            {mbew
                              ? formatCurrency(mbew.vprsv === 'V' ? mbew.verpr : mbew.stprs, mbew.waers)
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL KONVERSI PR KE PO */}
      {convertingPr && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-4 shadow-lg">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Konversi PR {convertingPr.banfn} ke Purchase Order (ME21N)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {convertingPr.matnr} · {convertingPr.maktx} ({formatNumber(convertingPr.menge)}{' '}
                {convertingPr.meins})
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Vendor</label>
              <select
                value={convertLifnr}
                onChange={(e) => setConvertLifnr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
              >
                {data.vendors.map((v) => (
                  <option key={v.lifnr} value={v.lifnr}>
                    {v.lifnr} · {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Harga Satuan PO ({convertingPr.waers})
              </label>
              <input
                type="number"
                value={convertPrice}
                onChange={(e) => setConvertPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertingPr(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await onConvertPrToPo(convertingPr.banfn, {
                    lifnr: convertLifnr,
                    netpr: convertPrice,
                    eindt: convertingPr.lfdat,
                  });
                  setConvertingPr(null);
                  setFeedback(
                    res.ok
                      ? { type: 'ok', text: `PR ${convertingPr.banfn} berhasil dikonversi menjadi Purchase Order.` }
                      : { type: 'err', text: res.error || 'Gagal konversi PR.' }
                  );
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md"
              >
                Buat Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
