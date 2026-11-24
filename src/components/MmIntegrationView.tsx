import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Search,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import type {
  MovementTypeCode,
  PurchaseRequisition,
  SapBootstrapPayload,
  SplitValuationItem,
  ValuationTypeCode,
} from '../types/sap.ts';
import { formatCurrency, formatNumber, matchesMaterialSearch } from '../utils/format.ts';

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
    bwtar?: ValuationTypeCode;
  }) => Promise<{ ok: boolean; error?: string }>;
  onConvertPrToPo: (
    banfn: string,
    payload: { lifnr: string; netpr: number; eindt: string; bwtar?: ValuationTypeCode }
  ) => Promise<{ ok: boolean; error?: string }>;
  onCreatePo: (payload: {
    lifnr: string;
    matnr: string;
    werks: string;
    lgort: string;
    menge: number;
    netpr: number;
    eindt: string;
    bwtar?: ValuationTypeCode;
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
    bwtar?: ValuationTypeCode;
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
  const defaultPlant = preselectedWerks || data.plants[0]?.werks || '1000';
  const defaultSloc = data.plants[0]?.storageLocations[0]?.lgort || '0001';
  const [selectedMatnr, setSelectedMatnr] = useState(defaultMatnr);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [werks, setWerks] = useState(defaultPlant);
  const [lgort, setLgort] = useState(defaultSloc);
  const [qty, setQty] = useState(10);
  const [dateInput, setDateInput] = useState('2026-11-30');
  const [lifnr, setLifnr] = useState(data.vendors[0]?.lifnr || '');
  const [poPrice, setPoPrice] = useState(15000);
  const [selectedBwtar, setSelectedBwtar] = useState<ValuationTypeCode>('LOCAL');

  // MIGO states
  const [bwart, setBwart] = useState<MovementTypeCode>('101');
  const [selectedEbeln, setSelectedEbeln] = useState(
    data.purchaseOrders.find((p) => p.status !== 'Completed')?.ebeln || ''
  );
  const [targetLgort, setTargetLgort] = useState(data.plants[0]?.storageLocations[1]?.lgort || '0002');
  const [kostl, setKostl] = useState('CC-OPS-100');
  const [bktxt, setBktxt] = useState('');

  // PR -> PO Conversion modal state
  const [convertingPr, setConvertingPr] = useState<PurchaseRequisition | null>(null);
  const [convertLifnr, setConvertLifnr] = useState(data.vendors[0]?.lifnr || '');
  const [convertPrice, setConvertPrice] = useState(0);
  const [convertBwtar, setConvertBwtar] = useState<ValuationTypeCode>('LOCAL');

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync defaults when switching tenant
  useEffect(() => {
    setFeedback(null);
    setConvertingPr(null);
    const firstM = data.materials[0];
    const firstPlant = firstM ? Object.keys(firstM.marc)[0] || data.plants[0]?.werks || '1000' : data.plants[0]?.werks || '1000';
    const firstSloc = firstM
      ? Object.values(firstM.mard).find((s) => s.werks === firstPlant)?.lgort || data.plants[0]?.storageLocations[0]?.lgort || '0001'
      : data.plants[0]?.storageLocations[0]?.lgort || '0001';
    setSelectedMatnr(firstM?.mara.matnr || '');
    setWerks(firstPlant);
    setLgort(firstSloc);
    setTargetLgort(data.plants.find((p) => p.werks === firstPlant)?.storageLocations.find((s) => s.lgort !== firstSloc)?.lgort || '0002');
    setLifnr(data.vendors[0]?.lifnr || '');
    setConvertLifnr(data.vendors[0]?.lifnr || '');
    setSelectedEbeln(data.purchaseOrders.find((p) => p.status !== 'Completed')?.ebeln || '');
    if (firstM) {
      const mbew = firstM.mbew[firstPlant] || Object.values(firstM.mbew)[0];
      if (mbew) {
        const splitKeys = Object.keys(mbew.splitValuations || {}) as ValuationTypeCode[];
        const defaultVt = splitKeys[0] || 'LOCAL';
        setSelectedBwtar(defaultVt);
        const splitRow = mbew.bwtty ? mbew.splitValuations?.[defaultVt] : undefined;
        setPoPrice(
          splitRow
            ? splitRow.vprsv === 'V'
              ? splitRow.verpr
              : splitRow.stprs
            : mbew.vprsv === 'V'
            ? mbew.verpr
            : mbew.stprs
        );
      }
    }
  }, [data.activeTenant.tenantId]);

  const activeMaterial = useMemo(
    () => data.materials.find((m) => m.mara.matnr === selectedMatnr) || data.materials[0],
    [data.materials, selectedMatnr]
  );
  const companyPlantWerks = useMemo(
    () =>
      new Set(
        data.plants
          .filter((plant) => plant.bukrs === data.activeTenant.bukrs)
          .map((plant) => plant.werks)
      ),
    [data.plants, data.activeTenant.bukrs]
  );
  const stockMaterials = useMemo(
    () =>
      data.materials.filter((material) =>
        Object.values(material.mard).some(
          (storage) =>
            companyPlantWerks.has(storage.werks) &&
            (storage.labst > 0 || storage.insme > 0 || storage.speme > 0)
        )
      ),
    [data.materials, companyPlantWerks]
  );
  const activeStockMaterial = useMemo(
    () =>
      stockMaterials.find((material) => material.mara.matnr === selectedMatnr) ||
      stockMaterials[0],
    [stockMaterials, selectedMatnr]
  );
  const filteredStockMaterials = useMemo(() => {
    const query = stockSearchQuery.trim();
    if (!query) return [];
    return stockMaterials.filter((material) =>
      matchesMaterialSearch(material, query, data.searchDictionary, data.materialGroups)
    );
  }, [stockMaterials, data.searchDictionary, data.materialGroups, stockSearchQuery]);

  const activePlantMbew = activeMaterial?.mbew[werks];
  const isSplitActive = Boolean(activePlantMbew?.bwtty);
  const availableValuationTypes: ValuationTypeCode[] = useMemo(() => {
    if (!activePlantMbew?.bwtty) return [];
    const configured = Object.keys(activePlantMbew.splitValuations || {}) as ValuationTypeCode[];
    return configured.length > 0 ? configured : ['LOCAL', 'IMPORT', 'FREE', 'OLD'];
  }, [activePlantMbew]);

  const applyValuationTypePrice = (matnrVal: string, werksVal: string, bwtarVal: ValuationTypeCode) => {
    if (bwtarVal === 'FREE') {
      setPoPrice(0);
      return;
    }
    const m = data.materials.find((x) => x.mara.matnr === matnrVal);
    const mbew = m?.mbew[werksVal] || (m ? Object.values(m.mbew)[0] : undefined);
    const splitRow = mbew?.splitValuations?.[bwtarVal];
    if (splitRow) {
      setPoPrice(splitRow.vprsv === 'S' ? splitRow.stprs : splitRow.verpr);
    } else if (mbew) {
      setPoPrice(mbew.vprsv === 'S' ? mbew.stprs : mbew.verpr);
    }
  };

  // Sync preselection from Material Master / List
  useEffect(() => {
    if (preselectedMatnr) {
      setSelectedMatnr(preselectedMatnr);
      const m = data.materials.find((x) => x.mara.matnr === preselectedMatnr);
      if (m) {
        const firstW = preselectedWerks && m.marc[preselectedWerks] ? preselectedWerks : Object.keys(m.marc)[0] || data.plants[0]?.werks || '1000';
        setWerks(firstW);
        const firstS = Object.values(m.mard).find((s) => s.werks === firstW)?.lgort || data.plants[0]?.storageLocations[0]?.lgort || '0001';
        setLgort(firstS);
        const mbew = m.mbew[firstW] || Object.values(m.mbew)[0];
        if (mbew) {
          const splitKeys = Object.keys(mbew.splitValuations || {}) as ValuationTypeCode[];
          const defaultVt = splitKeys[0] || 'LOCAL';
          setSelectedBwtar(defaultVt);
          const splitRow = mbew.bwtty ? mbew.splitValuations?.[defaultVt] : undefined;
          setPoPrice(
            splitRow
              ? splitRow.vprsv === 'V'
                ? splitRow.verpr
                : splitRow.stprs
              : mbew.vprsv === 'V'
              ? mbew.verpr
              : mbew.stprs
          );
        }
      }
    }
  }, [preselectedMatnr, preselectedWerks, data.materials, data.plants]);

  // Keep plant storage options valid
  const plantDef = data.plants.find((p) => p.werks === werks) || data.plants[0];

  // Auto-fill PO price when material changes
  const handleSelectMaterial = (matnr: string) => {
    setSelectedMatnr(matnr);
    const m = data.materials.find((x) => x.mara.matnr === matnr);
    if (m) {
      const firstW = Object.keys(m.marc)[0] || data.plants[0]?.werks || '1000';
      setWerks(firstW);
      const firstS = Object.values(m.mard).find((s) => s.werks === firstW)?.lgort || data.plants[0]?.storageLocations[0]?.lgort || '0001';
      setLgort(firstS);
      const mbew = m.mbew[firstW] || Object.values(m.mbew)[0];
      if (mbew) {
        const splitKeys = Object.keys(mbew.splitValuations || {}) as ValuationTypeCode[];
        const defaultVt = splitKeys[0] || 'LOCAL';
        setSelectedBwtar(defaultVt);
        const splitRow = mbew.bwtty ? mbew.splitValuations?.[defaultVt] : undefined;
        setPoPrice(
          splitRow
            ? splitRow.vprsv === 'V'
              ? splitRow.verpr
              : splitRow.stprs
            : mbew.vprsv === 'V'
            ? mbew.verpr
            : mbew.stprs
        );
      }
    }
  };

  // When selecting an Open PO in MIGO 101, auto-bind material, plant, storage, remaining qty, valuation type
  const handleSelectPoForMigo = (ebeln: string) => {
    setSelectedEbeln(ebeln);
    const po = data.purchaseOrders.find((p) => p.ebeln === ebeln);
    if (po) {
      setSelectedMatnr(po.matnr);
      setWerks(po.werks);
      setLgort(po.lgort);
      setQty(Math.max(1, po.menge - po.receivedQty));
      if (po.bwtar) setSelectedBwtar(po.bwtar);
    }
  };

  // Live MIGO Stock & MAP Simulation
  const migoPreview = useMemo(() => {
    if (!activeMaterial) return null;
    const mardKey = `${werks}-${lgort}`;
    const currentStock = activeMaterial.mard[mardKey]?.labst || 0;
    const mbew = activeMaterial.mbew[werks] || Object.values(activeMaterial.mbew)[0];
    const splitActive = Boolean(mbew?.bwtty);
    const po = bwart === '101' ? data.purchaseOrders.find((p) => p.ebeln === selectedEbeln) : undefined;
    const activeVt: ValuationTypeCode | undefined = splitActive
      ? bwart === '101' && po?.bwtar
        ? po.bwtar
        : selectedBwtar
      : undefined;
    const splitRow = activeVt ? mbew?.splitValuations?.[activeVt] : undefined;

    const currentLbkum = splitRow ? splitRow.lbkum : mbew?.lbkum || 0;
    const currentSalk3 = splitRow ? splitRow.salk3 : mbew?.salk3 || 0;
    const currentVerpr = activeVt === 'FREE' ? 0 : splitRow ? splitRow.verpr : mbew?.verpr || 0;
    const peinh = splitRow ? splitRow.peinh : mbew?.peinh || 1;
    const waers = mbew?.waers || 'IDR';
    const vprsv = splitRow ? splitRow.vprsv : mbew?.vprsv || 'V';

    if (bwart === '101') {
      const grPrice = activeVt === 'FREE' ? 0 : po ? po.netpr / (po.peinh || 1) : currentVerpr;
      const dmbtr = Math.round(qty * grPrice);
      const afterStock = currentStock + qty;
      const afterLbkum = currentLbkum + qty;
      const afterSalk3 =
        vprsv === 'V'
          ? currentSalk3 + dmbtr
          : Math.round((afterLbkum * (splitRow?.stprs ?? mbew?.stprs ?? grPrice)) / peinh);
      const afterVerpr =
        activeVt === 'FREE'
          ? 0
          : vprsv === 'V' && afterLbkum > 0
          ? Math.round((afterSalk3 / afterLbkum) * peinh)
          : currentVerpr;

      return {
        beforeStock: currentStock,
        afterStock,
        beforePrice: currentVerpr,
        afterPrice: afterVerpr,
        dmbtr,
        waers,
        vprsv,
        activeVt,
      };
    }

    if (bwart === '201') {
      const unitP = activeVt === 'FREE' ? 0 : vprsv === 'V' ? currentVerpr : splitRow?.stprs ?? mbew?.stprs ?? 0;
      return {
        beforeStock: currentStock,
        afterStock: currentStock - qty,
        beforePrice: currentVerpr,
        afterPrice: currentVerpr,
        dmbtr: Math.round((qty * unitP) / peinh),
        waers,
        vprsv,
        activeVt,
      };
    }

    if (bwart === '311') {
      const unitP = activeVt === 'FREE' ? 0 : vprsv === 'V' ? currentVerpr : splitRow?.stprs ?? mbew?.stprs ?? 0;
      return {
        beforeStock: currentStock,
        afterStock: currentStock - qty,
        beforePrice: currentVerpr,
        afterPrice: currentVerpr,
        dmbtr: Math.round((qty * unitP) / peinh),
        waers,
        vprsv,
        activeVt,
      };
    }

    // 561
    const unitP = activeVt === 'FREE' ? 0 : vprsv === 'V' ? currentVerpr : splitRow?.stprs ?? mbew?.stprs ?? 0;
    return {
      beforeStock: currentStock,
      afterStock: currentStock + qty,
      beforePrice: currentVerpr,
      afterPrice: currentVerpr,
      dmbtr: Math.round((qty * unitP) / peinh),
      waers,
      vprsv,
      activeVt,
    };
  }, [activeMaterial, werks, lgort, bwart, qty, selectedEbeln, selectedBwtar, data.purchaseOrders]);

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
                bwtar: isSplitActive ? selectedBwtar : undefined,
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

            {isSplitActive && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valuation Type (BWTAR)
                </label>
                <select
                  value={selectedBwtar}
                  onChange={(e) => {
                    const vt = e.target.value as ValuationTypeCode;
                    setSelectedBwtar(vt);
                    applyValuationTypePrice(selectedMatnr, werks, vt);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {availableValuationTypes.map((vt) => (
                    <option key={vt} value={vt}>
                      {vt} · {data.valuationTypes?.find((d) => d.bwtar === vt)?.label || vt}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                  <span className="text-slate-500">
                    Estimasi Nilai ({isSplitActive ? selectedBwtar : 'MBEW'}):
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(
                      isSplitActive && selectedBwtar === 'FREE'
                        ? 0
                        : qty *
                            (isSplitActive && activePlantMbew?.splitValuations?.[selectedBwtar]
                              ? activePlantMbew.splitValuations[selectedBwtar]!.vprsv === 'S'
                                ? activePlantMbew.splitValuations[selectedBwtar]!.stprs
                                : activePlantMbew.splitValuations[selectedBwtar]!.verpr
                              : activeMaterial.mbew[werks]?.vprsv === 'S'
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
                        <div>{pr.werks} / {pr.lgort}</div>
                        {pr.bwtar && (
                          <div className="text-[11px] font-semibold text-[#0064D9]">Val: {pr.bwtar}</div>
                        )}
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
                              setConvertBwtar(pr.bwtar || 'LOCAL');
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
                netpr: isSplitActive && selectedBwtar === 'FREE' ? 0 : poPrice,
                eindt: dateInput,
                bwtar: isSplitActive ? selectedBwtar : undefined,
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

            {isSplitActive && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valuation Type (EKPO-BWTAR)
                </label>
                <select
                  value={selectedBwtar}
                  onChange={(e) => {
                    const vt = e.target.value as ValuationTypeCode;
                    setSelectedBwtar(vt);
                    applyValuationTypePrice(selectedMatnr, werks, vt);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {availableValuationTypes.map((vt) => (
                    <option key={vt} value={vt}>
                      {vt} · {data.valuationTypes?.find((d) => d.bwtar === vt)?.label || vt}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                  min={0}
                  disabled={isSplitActive && selectedBwtar === 'FREE'}
                  required
                  value={isSplitActive && selectedBwtar === 'FREE' ? 0 : poPrice}
                  onChange={(e) => setPoPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
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
                {formatCurrency(qty * (isSplitActive && selectedBwtar === 'FREE' ? 0 : poPrice))}
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
                          {po.werks}/{po.lgort}{po.bwtar ? ` · ${po.bwtar}` : ''}
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
                bwtar: isSplitActive ? selectedBwtar : undefined,
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

            {isSplitActive && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valuation Type (MSEG-BWTAR)
                </label>
                <select
                  value={selectedBwtar}
                  onChange={(e) => setSelectedBwtar(e.target.value as ValuationTypeCode)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                >
                  {availableValuationTypes.map((vt) => {
                    const splitStock = activePlantMbew?.splitValuations?.[vt]?.lbkum ?? 0;
                    return (
                      <option key={vt} value={vt}>
                        {vt} · Stok {formatNumber(splitStock)} {activeMaterial?.mara.meins}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Real-Time Stock & Valuation Simulation Box */}
            {migoPreview && activeMaterial && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-xs">
                <div className="font-semibold text-slate-800">
                  Simulasi Dampak Material Master {migoPreview.activeVt ? `(${migoPreview.activeVt})` : ''}
                </div>
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
                          {doc.bwtar ? ` · [${doc.bwtar}]` : ''}
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
                Kamus clue berlaku corporate; stok dibatasi ke company code{' '}
                {data.activeTenant.bukrs}. Rincian Unrestricted (LABST), Quality Inspection
                (INSME), Blocked (SPEME), dan On-Order PO.
              </p>
            </div>
            <label className="relative w-full sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="search"
                value={stockSearchQuery}
                onChange={(event) => setStockSearchQuery(event.target.value)}
                aria-label="Cari stok berdasarkan clue, deskripsi, atau Material Group"
                placeholder="Cari clue, deskripsi, Material Group, atau MATNR..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              />
            </label>
          </div>

          {stockSearchQuery.trim() && (
            <div className="px-4 pt-4">
              <div className="text-xs font-medium text-slate-600 mb-2">
                {filteredStockMaterials.length} material dengan stok di{' '}
                {data.activeTenant.bukrs} cocok dengan “{stockSearchQuery.trim()}”
              </div>
              {filteredStockMaterials.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                        <th className="py-2 px-3">Material</th>
                        <th className="py-2 px-3">Deskripsi</th>
                        <th className="py-2 px-3">Material Group</th>
                        <th className="py-2 px-3 text-right">Unrestricted</th>
                        <th className="py-2 px-3 text-right">Quality</th>
                        <th className="py-2 px-3 text-right">Blocked</th>
                        <th className="py-2 px-3 text-right">On-Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredStockMaterials.map((material) => {
                        const materialGroup = data.materialGroups.find(
                          (group) => group.matkl === material.mara.matkl
                        );
                        const companyStorage = Object.values(material.mard).filter((storage) =>
                          companyPlantWerks.has(storage.werks)
                        );
                        const openOrder = data.purchaseOrders
                          .filter(
                            (order) =>
                              order.matnr === material.mara.matnr &&
                              companyPlantWerks.has(order.werks) &&
                              order.status !== 'Completed'
                          )
                          .reduce((sum, order) => sum + (order.menge - order.receivedQty), 0);
                        return (
                          <tr
                            key={material.mara.matnr}
                            className={`hover:bg-blue-50 ${
                              selectedMatnr === material.mara.matnr ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-semibold text-[#0064D9]">
                              <button
                                type="button"
                                onClick={() => setSelectedMatnr(material.mara.matnr)}
                                aria-label={`Tampilkan stok ${material.mara.matnr} ${material.mara.maktx}`}
                                className="text-left hover:underline"
                              >
                                {material.mara.matnr}
                              </button>
                            </td>
                            <td className="py-2 px-3">{material.mara.maktx}</td>
                            <td className="py-2 px-3">
                              {materialGroup?.label || material.mara.matkl}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">
                              {formatNumber(
                                companyStorage.reduce(
                                  (sum, storage) => sum + storage.labst,
                                  0
                                )
                              )}{' '}
                              {material.mara.meins}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">
                              {formatNumber(
                                companyStorage.reduce(
                                  (sum, storage) => sum + storage.insme,
                                  0
                                )
                              )}{' '}
                              {material.mara.meins}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">
                              {formatNumber(
                                companyStorage.reduce(
                                  (sum, storage) => sum + storage.speme,
                                  0
                                )
                              )}{' '}
                              {material.mara.meins}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">
                              {formatNumber(openOrder)} {material.mara.meins}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-3 py-4 text-xs text-slate-500 border border-slate-200 rounded-md">
                  Tidak ada stock yang cocok dengan clue, deskripsi, atau Material Group tersebut.
                </p>
              )}
            </div>
          )}

          {!stockSearchQuery.trim() && stockMaterials.length === 0 && (
            <p className="m-4 px-3 py-4 text-xs text-slate-500 border border-slate-200 rounded-md">
              Tidak ada stok untuk company code {data.activeTenant.bukrs}.
            </p>
          )}

          {activeStockMaterial &&
            (!stockSearchQuery.trim() ||
              filteredStockMaterials.some(
                (material) => material.mara.matnr === activeStockMaterial.mara.matnr
              )) && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                <div>
                  <div className="text-[11px] text-slate-500">Material</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {activeStockMaterial.mara.matnr}
                  </div>
                  <div className="text-xs text-slate-600 truncate">{activeStockMaterial.mara.maktx}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total Unrestricted</div>
                  <div className="font-mono font-bold text-slate-900 text-lg tabular-nums mt-0.5">
                    {formatNumber(
                      Object.values(activeStockMaterial.mard)
                        .filter((storage) => companyPlantWerks.has(storage.werks))
                        .reduce((a, b) => a + b.labst, 0)
                    )}{' '}
                    {activeStockMaterial.mara.meins}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">On-Order Stock (Open PO)</div>
                  <div className="font-mono font-bold text-[#0064D9] text-lg tabular-nums mt-0.5">
                    {formatNumber(
                      data.purchaseOrders
                        .filter(
                          (p) =>
                            p.matnr === activeStockMaterial.mara.matnr &&
                            companyPlantWerks.has(p.werks) &&
                            p.status !== 'Completed'
                        )
                        .reduce((a, p) => a + (p.menge - p.receivedQty), 0)
                    )}{' '}
                    {activeStockMaterial.mara.meins}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Total Inventory Value</div>
                  <div className="font-mono font-bold text-slate-900 text-lg tabular-nums mt-0.5">
                    {formatCurrency(
                      Object.values(activeStockMaterial.mbew)
                        .filter((valuation) => companyPlantWerks.has(valuation.bwkey))
                        .reduce((a, b) => a + b.salk3, 0)
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
                    {Object.values(activeStockMaterial.mard)
                      .filter((storage) => companyPlantWerks.has(storage.werks))
                      .map((s) => {
                        const mbew = activeStockMaterial.mbew[s.werks];
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
                              {formatNumber(s.labst)} {activeStockMaterial.mara.meins}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                              {formatNumber(s.insme)} {activeStockMaterial.mara.meins}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-red-700">
                              {formatNumber(s.speme)} {activeStockMaterial.mara.meins}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                              {mbew
                                ? formatCurrency(
                                    mbew.vprsv === 'V' ? mbew.verpr : mbew.stprs,
                                    mbew.waers
                                  )
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Split Valuation Breakdown per Plant in MMBE */}
              {Object.values(activeStockMaterial.mbew).some(
                (m) => companyPlantWerks.has(m.bwkey) && Boolean(m.bwtty)
              ) && (
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Split Valuation Breakdown (MBEW-BWTAR: LOCAL · IMPORT · FREE · OLD)
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                          <th className="py-2.5 px-4">Plant (BWKEY)</th>
                          <th className="py-2.5 px-4">Valuation Type (BWTAR)</th>
                          <th className="py-2.5 px-4">Price Ctrl</th>
                          <th className="py-2.5 px-4 text-right">Stok Valuasi (LBKUM)</th>
                          <th className="py-2.5 px-4 text-right">Harga Unit</th>
                          <th className="py-2.5 px-4 text-right">Total Nilai (SALK3)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Object.values(activeStockMaterial.mbew)
                          .filter(
                            (m) =>
                              companyPlantWerks.has(m.bwkey) &&
                              Boolean(m.bwtty) &&
                              m.splitValuations
                          )
                          .flatMap((m) =>
                            Object.values(m.splitValuations!)
                              .filter((sv): sv is SplitValuationItem => Boolean(sv))
                              .map((sv) => (
                                <tr key={`${m.bwkey}-${sv.bwtar}`} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                                    Plant {m.bwkey}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-[#0064D9]">
                                    {sv.bwtar}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-slate-600">
                                    {sv.vprsv === 'V' ? 'V (MAP)' : 'S (Std)'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                    {formatNumber(sv.lbkum)} {activeStockMaterial.mara.meins}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                                    {formatCurrency(sv.vprsv === 'V' ? sv.verpr : sv.stprs, m.waers)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                    {formatCurrency(sv.salk3, m.waers)}
                                  </td>
                                </tr>
                              ))
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

            {data.materials.find((m) => m.mara.matnr === convertingPr.matnr)?.mbew[convertingPr.werks]?.bwtty && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valuation Type (BWTAR)
                </label>
                <select
                  value={convertBwtar}
                  onChange={(e) => {
                    const vt = e.target.value as ValuationTypeCode;
                    setConvertBwtar(vt);
                    if (vt === 'FREE') setConvertPrice(0);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md"
                >
                  {(['LOCAL', 'IMPORT', 'FREE', 'OLD'] as ValuationTypeCode[]).map((vt) => (
                    <option key={vt} value={vt}>
                      {vt} · {data.valuationTypes?.find((d) => d.bwtar === vt)?.label || vt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Harga Satuan PO ({convertingPr.waers})
              </label>
              <input
                type="number"
                disabled={convertBwtar === 'FREE'}
                value={convertBwtar === 'FREE' ? 0 : convertPrice}
                onChange={(e) => setConvertPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md disabled:bg-slate-100"
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
                  const hasSplit = Boolean(
                    data.materials.find((m) => m.mara.matnr === convertingPr.matnr)?.mbew[
                      convertingPr.werks
                    ]?.bwtty
                  );
                  const res = await onConvertPrToPo(convertingPr.banfn, {
                    lifnr: convertLifnr,
                    netpr: convertBwtar === 'FREE' ? 0 : convertPrice,
                    eindt: convertingPr.lfdat,
                    bwtar: hasSplit ? convertBwtar : undefined,
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
