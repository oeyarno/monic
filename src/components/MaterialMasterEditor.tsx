import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  FileSpreadsheet,
  Lock,
  Plus,
  Save,
  ShoppingCart,
  Sliders,
  Trash2,
  Warehouse,
} from 'lucide-react';
import type {
  CustomIndustryField,
  FieldStatus,
  IndustrySectorCode,
  MarcPlantData,
  MardStorageData,
  MaterialMasterRecord,
  MaterialTypeCode,
  MaterialViewKey,
  MbewValuationData,
  SapBootstrapPayload,
  SplitValuationItem,
  ValuationCategoryCode,
  ValuationTypeCode,
} from '../types/sap.ts';
import { formatCurrency, formatNumber } from '../utils/format.ts';

interface MaterialMasterEditorProps {
  data: SapBootstrapPayload;
  mode: 'create' | 'edit' | 'view';
  initialMatnr?: string;
  onModeChange: (mode: 'create' | 'edit' | 'view') => void;
  onSelectMaterial: (matnr: string) => void;
  onSaveMaterial: (
    material: MaterialMasterRecord,
    isCreate: boolean,
    activeWerks: string
  ) => Promise<{ ok: boolean; error?: string; details?: string[] }>;
  onDeleteMaterial: (matnr: string) => Promise<{ ok: boolean; error?: string }>;
  onBackToList: () => void;
  onOpenCustomizing: (industry: IndustrySectorCode) => void;
  onMmAction: (action: 'me51n' | 'me21n' | 'migo' | 'mmbe', matnr: string, werks: string) => void;
}

const VIEW_TABS: { key: MaterialViewKey; label: string; tableHint: string }[] = [
  { key: 'basic', label: 'Basic Data 1 & 2', tableHint: 'MARA' },
  { key: 'classification', label: 'Classification & Karakteristik', tableHint: 'CT04' },
  { key: 'purchasing', label: 'Purchasing', tableHint: 'MARA · MARC' },
  { key: 'mrp', label: 'MRP 1–4', tableHint: 'MARC' },
  { key: 'storage', label: 'Plant / Storage', tableHint: 'MARC · MARD' },
  { key: 'accounting', label: 'Accounting 1', tableHint: 'MBEW' },
  { key: 'sales', label: 'Sales Org', tableHint: 'MVKE' },
  { key: 'industry', label: 'Spesifik Industri', tableHint: 'CI_MARA' },
];

function createEmptyMaterial(
  data: SapBootstrapPayload,
  mtart: MaterialTypeCode = 'ROH',
  mbrsh: IndustrySectorCode = data.activeTenant?.defaultIndustry || 'M',
  werks = data.plants[0]?.werks || '1000',
  lgort = data.plants[0]?.storageLocations[0]?.lgort || '0001'
): MaterialMasterRecord {
  const mtDef = data.materialTypes.find((m) => m.mtart === mtart) || data.materialTypes[0];
  const prefix = mtDef.internalNumberPrefix;
  let maxSeq = 100;
  for (const m of data.materials) {
    if (m.mara.matnr.startsWith(prefix)) {
      const n = Number.parseInt(m.mara.matnr.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n >= maxSeq) maxSeq = n + 1;
    }
  }
  const matnr = `${prefix}${String(maxSeq).padStart(3, '0')}`;
  const plantDef = data.plants.find((p) => p.werks === werks) || data.plants[0];
  const slocDef =
    plantDef.storageLocations.find((s) => s.lgort === lgort) || plantDef.storageLocations[0];

  const extensions: Record<string, string | number | boolean> = {};
  for (const cf of data.customIndustryFields.filter((f) => f.industrySector === mbrsh)) {
    if (cf.defaultValue !== undefined) {
      extensions[cf.fieldName] = cf.defaultValue;
    } else if (cf.dataType === 'boolean') {
      extensions[cf.fieldName] = false;
    } else if (cf.dataType === 'number') {
      extensions[cf.fieldName] = 0;
    } else {
      extensions[cf.fieldName] = '';
    }
  }

  return {
    mara: {
      matnr,
      maktx: '',
      mtart,
      mbrsh,
      meins: 'KG',
      matkl: 'GEN-001',
      bismt: '',
      spart: '01',
      brgew: 1,
      ntgew: 1,
      gewei: 'KG',
      volum: 0.01,
      voleh: 'M3',
      groes: '',
      ean11: '',
      mstae: '',
      xchpf: mbrsh === 'C' || mbrsh === 'P' || mbrsh === 'F',
      createdAt: new Date().toISOString(),
      createdBy: 'SAP_USER',
      updatedAt: new Date().toISOString(),
    },
    marc: {
      [plantDef.werks]: {
        werks: plantDef.werks,
        ekgrp: 'P01',
        bstme: 'KG',
        ekwsl: 'Z001',
        kautb: false,
        webaz: 1,
        kordp: false,
        dismm: 'PD',
        dispo: 'M01',
        minbe: 100,
        disls: 'EX',
        bstmi: 10,
        bstma: 1000,
        bstfe: 100,
        eisbe: 50,
        beskz: 'F',
        plifz: 7,
        mtvfp: '02',
        prctr: `PC-${plantDef.werks}`,
        sernp: '',
      },
    },
    mard: {
      [`${plantDef.werks}-${slocDef.lgort}`]: {
        werks: plantDef.werks,
        lgort: slocDef.lgort,
        lgobe: slocDef.lgobe,
        lgpbe: `BIN-${slocDef.lgort}-01`,
        labst: 0,
        insme: 0,
        speme: 0,
        raube: '01 - Normal Indoor',
        tempb: 'Ambient',
        maxlz: 365,
        mhdrz: 90,
        mhdhb: 365,
      },
    },
    mbew: {
      [plantDef.werks]: {
        bwkey: plantDef.werks,
        bwtty: '',
        bklas: mtDef.defaultBklas,
        vprsv: mtDef.priceControlDefault,
        verpr: 10000,
        stprs: 10000,
        peinh: 1,
        waers: 'IDR',
        lbkum: 0,
        salk3: 0,
      },
    },
    mvke: {
      vkorg: '1000',
      vtweg: '10',
      dwerk: plantDef.werks,
      taxkm: '1',
      mtpos: 'NORM',
      kondm: '01',
      tragr: '0001',
      ladgr: '0001',
    },
    industryExtensions: extensions,
    characteristics: {},
  };
}

export function MaterialMasterEditor({
  data,
  mode,
  initialMatnr,
  onModeChange,
  onSelectMaterial,
  onSaveMaterial,
  onDeleteMaterial,
  onBackToList,
  onOpenCustomizing,
  onMmAction,
}: MaterialMasterEditorProps) {
  const defaultPlant = data.plants[0]?.werks || '1000';
  const defaultSloc = data.plants[0]?.storageLocations[0]?.lgort || '0001';
  const [activeView, setActiveView] = useState<MaterialViewKey>('basic');
  const [activeWerks, setActiveWerks] = useState(defaultPlant);
  const [activeLgort, setActiveLgort] = useState(defaultSloc);
  const [draft, setDraft] = useState<MaterialMasterRecord>(() => {
    if (mode === 'create') return createEmptyMaterial(data);
    const found = data.materials.find((m) => m.mara.matnr === initialMatnr) || data.materials[0];
    return found ? structuredClone(found) : createEmptyMaterial(data);
  });
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string[] | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [materialGroups, setMaterialGroups] = useState(data.materialGroups || []);
  const [manageCt04, setManageCt04] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharLabel, setNewCharLabel] = useState('');
  const [newCharOptions, setNewCharOptions] = useState('');
  const [ct04Message, setCt04Message] = useState<string | null>(null);

  // Sync draft when switching selected material, mode, or tenant
  useEffect(() => {
    setErrorBanner(null);
    setSuccessMsg(null);
    setConfirmDelete(false);
    const tenantPlant = data.plants[0]?.werks || '1000';
    const tenantSloc = data.plants[0]?.storageLocations[0]?.lgort || '0001';
    if (mode === 'create') {
      setDraft(createEmptyMaterial(data));
      setActiveWerks(tenantPlant);
      setActiveLgort(tenantSloc);
      return;
    }
    const found = data.materials.find((m) => m.mara.matnr === initialMatnr) || data.materials[0];
    if (found) {
      setDraft(structuredClone(found));
      const firstPlant = Object.keys(found.marc)[0] || tenantPlant;
      setActiveWerks(firstPlant);
      const firstSloc = Object.values(found.mard).find((s) => s.werks === firstPlant)?.lgort || tenantSloc;
      setActiveLgort(firstSloc);
    } else {
      setDraft(createEmptyMaterial(data));
      setActiveWerks(tenantPlant);
      setActiveLgort(tenantSloc);
    }
  }, [mode, initialMatnr, data.materials, data.activeTenant.tenantId]);

  useEffect(() => { setMaterialGroups(data.materialGroups || []); }, [data.materialGroups, data.activeTenant.tenantId]);

  const isReadOnly = mode === 'view';
  const currentPlantDef = data.plants.find((p) => p.werks === activeWerks) || data.plants[0];
  const activeMarc: MarcPlantData | undefined = draft.marc[activeWerks];
  const activeMardKey = `${activeWerks}-${activeLgort}`;
  const activeMard: MardStorageData | undefined = draft.mard[activeMardKey];
  const activeMbew: MbewValuationData | undefined = draft.mbew[activeWerks];

  // OMS9 Field Status Lookup
  const getStandardStatus = (fieldKey: string): FieldStatus => {
    const rule = data.standardFieldRules.find((r) => r.fieldKey === fieldKey);
    if (!rule) return 'optional';
    return rule.rulesByIndustry[draft.mara.mbrsh] || 'optional';
  };

  const activeMaterialGroup = materialGroups.find((group) => group.matkl === draft.mara.matkl);
  const characteristicValues = draft.characteristics || {};
  const requiredCharacteristicCount = activeMaterialGroup?.characteristics.filter((ch) => ch.required).length || 0;
  const filledCharacteristicCount = activeMaterialGroup?.characteristics.filter((ch) => ch.required && String(characteristicValues[ch.charName] ?? '').trim()).length || 0;
  const generatedShortName = activeMaterialGroup?.characteristics.map((ch) => String(characteristicValues[ch.charName] ?? '').trim()).filter(Boolean).join('-') || '';

  const updateCharacteristicValue = (charName: string, value: string | number | boolean) => {
    setDraft((prev) => ({ ...prev, characteristics: { ...(prev.characteristics || {}), [charName]: value } }));
  };

  const persistCt04Group = async (group: (typeof materialGroups)[number]) => {
    const response = await fetch(`/api/customizing/material-groups/${encodeURIComponent(group.matkl)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': data.activeTenant.tenantId }, body: JSON.stringify({ group }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Gagal menyimpan CT04.');
    setCt04Message('Master Characteristic berhasil disimpan.');
  };

  const addCt04Characteristic = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeMaterialGroup) return;
    const characteristic = { id: '', charName: newCharName.trim().toUpperCase(), label: newCharLabel.trim(), dataType: 'select' as const, options: newCharOptions.split(',').map((value) => value.trim()).filter(Boolean), required: true, helpText: '' };
    const response = await fetch(`/api/customizing/material-groups/${encodeURIComponent(activeMaterialGroup.matkl)}/characteristics`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': data.activeTenant.tenantId }, body: JSON.stringify({ characteristic }) });
    const result = await response.json();
    if (!response.ok) { setCt04Message(result.error || 'Gagal menambah karakteristik.'); return; }
    setMaterialGroups((current) => current.map((group) => group.matkl === activeMaterialGroup.matkl ? result.db.materialGroups.find((item: any) => item.matkl === group.matkl) : group));
    setNewCharName(''); setNewCharLabel(''); setNewCharOptions(''); setCt04Message('Karakteristik baru berhasil ditambahkan.');
  };

  const deleteCt04Characteristic = async (charId: string) => {
    if (!activeMaterialGroup) return;
    const response = await fetch(`/api/customizing/material-groups/${encodeURIComponent(activeMaterialGroup.matkl)}/characteristics/${encodeURIComponent(charId)}`, { method: 'DELETE', headers: { 'X-Tenant-Id': data.activeTenant.tenantId } });
    const result = await response.json();
    if (!response.ok) { setCt04Message(result.error || 'Gagal menghapus karakteristik.'); return; }
    setMaterialGroups(result.db.materialGroups);
    setCt04Message('Karakteristik dihapus.');
  };

  const industryCustomFields = useMemo(() => {
    return data.customIndustryFields.filter(
      (f) => f.industrySector === draft.mara.mbrsh && f.status !== 'hide'
    );
  }, [data.customIndustryFields, draft.mara.mbrsh]);

  const oms9Summary = useMemo(() => {
    let requiredCount = 0;
    let displayCount = 0;
    let hideCount = 0;
    for (const r of data.standardFieldRules) {
      const st = r.rulesByIndustry[draft.mara.mbrsh];
      if (st === 'required') requiredCount++;
      else if (st === 'display') displayCount++;
      else if (st === 'hide') hideCount++;
    }
    for (const cf of data.customIndustryFields.filter((f) => f.industrySector === draft.mara.mbrsh)) {
      if (cf.status === 'required') requiredCount++;
      else if (cf.status === 'display') displayCount++;
      else if (cf.status === 'hide') hideCount++;
    }
    return { requiredCount, displayCount, hideCount };
  }, [data.standardFieldRules, data.customIndustryFields, draft.mara.mbrsh]);

  const updateMara = <K extends keyof MaterialMasterRecord['mara']>(
    key: K,
    value: MaterialMasterRecord['mara'][K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      mara: { ...prev.mara, [key]: value },
    }));
  };

  const handleMaterialTypeChange = (newMtart: MaterialTypeCode) => {
    const mtDef = data.materialTypes.find((m) => m.mtart === newMtart);
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.mara.mtart = newMtart;
      if (mode === 'create' && mtDef) {
        const prefix = mtDef.internalNumberPrefix;
        let maxSeq = 100;
        for (const m of data.materials) {
          if (m.mara.matnr.startsWith(prefix)) {
            const n = Number.parseInt(m.mara.matnr.slice(prefix.length), 10);
            if (!Number.isNaN(n) && n >= maxSeq) maxSeq = n + 1;
          }
        }
        next.mara.matnr = `${prefix}${String(maxSeq).padStart(3, '0')}`;
        if (next.mbew[activeWerks]) {
          next.mbew[activeWerks].bklas = mtDef.defaultBklas;
          next.mbew[activeWerks].vprsv = mtDef.priceControlDefault;
        }
      }
      return next;
    });
  };

  const handleIndustrySectorChange = (newMbrsh: IndustrySectorCode) => {
    setDraft((prev) => {
      const nextExtensions = { ...prev.industryExtensions };
      for (const cf of data.customIndustryFields.filter((f) => f.industrySector === newMbrsh)) {
        if (nextExtensions[cf.fieldName] === undefined) {
          nextExtensions[cf.fieldName] =
            cf.defaultValue !== undefined
              ? cf.defaultValue
              : cf.dataType === 'boolean'
              ? false
              : cf.dataType === 'number'
              ? 0
              : '';
        }
      }
      return {
        ...prev,
        mara: { ...prev.mara, mbrsh: newMbrsh },
        industryExtensions: nextExtensions,
      };
    });
  };

  const updateMarc = <K extends keyof MarcPlantData>(key: K, value: MarcPlantData[K]) => {
    setDraft((prev) => {
      const existing = prev.marc[activeWerks];
      if (!existing) return prev;
      return {
        ...prev,
        marc: {
          ...prev.marc,
          [activeWerks]: { ...existing, [key]: value },
        },
      };
    });
  };

  const updateMard = <K extends keyof MardStorageData>(key: K, value: MardStorageData[K]) => {
    setDraft((prev) => {
      const existing = prev.mard[activeMardKey];
      if (!existing) return prev;
      return {
        ...prev,
        mard: {
          ...prev.mard,
          [activeMardKey]: { ...existing, [key]: value },
        },
      };
    });
  };

  const updateMbew = <K extends keyof MbewValuationData>(key: K, value: MbewValuationData[K]) => {
    setDraft((prev) => {
      const existing = prev.mbew[activeWerks];
      if (!existing) return prev;
      const updated = { ...existing, [key]: value };
      if (!updated.bwtty) {
        const unitPrice = updated.vprsv === 'V' ? updated.verpr : updated.stprs;
        updated.salk3 = Math.round((updated.lbkum * unitPrice) / (updated.peinh || 1));
      }
      return {
        ...prev,
        mbew: {
          ...prev.mbew,
          [activeWerks]: updated,
        },
      };
    });
  };

  const handleValuationCategoryChange = (bwtty: ValuationCategoryCode) => {
    setDraft((prev) => {
      const existing = prev.mbew[activeWerks];
      if (!existing) return prev;
      const nextSplit = structuredClone(existing.splitValuations || {});
      if (bwtty !== '' && Object.keys(nextSplit).length === 0) {
        const defaults: ValuationTypeCode[] =
          bwtty === 'H' ? ['LOCAL', 'IMPORT'] : bwtty === 'C' ? ['FREE', 'OLD'] : ['LOCAL', 'IMPORT', 'FREE', 'OLD'];
        for (const vt of defaults) {
          nextSplit[vt] = {
            bwtar: vt,
            bklas: existing.bklas,
            vprsv: existing.vprsv,
            verpr: vt === 'FREE' ? 0 : existing.verpr,
            stprs: vt === 'FREE' ? 0 : existing.stprs,
            peinh: existing.peinh,
            lbkum: vt === 'LOCAL' ? existing.lbkum : 0,
            salk3: vt === 'LOCAL' ? existing.salk3 : 0,
          };
        }
      }
      return {
        ...prev,
        mbew: {
          ...prev.mbew,
          [activeWerks]: {
            ...existing,
            bwtty,
            splitValuations: nextSplit,
          },
        },
      };
    });
  };

  const toggleSplitValuationType = (bwtar: ValuationTypeCode) => {
    setDraft((prev) => {
      const existing = prev.mbew[activeWerks];
      if (!existing) return prev;
      const nextSplit = structuredClone(existing.splitValuations || {});
      if (nextSplit[bwtar]) {
        if ((nextSplit[bwtar]?.lbkum || 0) > 0) return prev; // Keep active if stock > 0
        delete nextSplit[bwtar];
      } else {
        nextSplit[bwtar] = {
          bwtar,
          bklas: existing.bklas,
          vprsv: existing.vprsv,
          verpr: bwtar === 'FREE' ? 0 : existing.verpr,
          stprs: bwtar === 'FREE' ? 0 : existing.stprs,
          peinh: existing.peinh,
          lbkum: 0,
          salk3: 0,
        };
      }
      return {
        ...prev,
        mbew: {
          ...prev.mbew,
          [activeWerks]: {
            ...existing,
            splitValuations: nextSplit,
          },
        },
      };
    });
  };

  const updateSplitValuationItem = <K extends keyof SplitValuationItem>(
    bwtar: ValuationTypeCode,
    key: K,
    value: SplitValuationItem[K]
  ) => {
    setDraft((prev) => {
      const existing = prev.mbew[activeWerks];
      if (!existing || !existing.splitValuations?.[bwtar]) return prev;
      const nextSplit = structuredClone(existing.splitValuations);
      const item = nextSplit[bwtar]!;
      item[key] = value;
      if (bwtar === 'FREE') {
        item.verpr = 0;
        item.stprs = 0;
        item.salk3 = 0;
      } else {
        const uPrice = item.vprsv === 'V' ? item.verpr : item.stprs;
        item.salk3 = Math.round((item.lbkum * uPrice) / (item.peinh || 1));
      }
      const rows = Object.values(nextSplit).filter((x): x is SplitValuationItem => Boolean(x));
      const totalQty = rows.reduce((s, x) => s + x.lbkum, 0);
      const totalVal = rows.reduce((s, x) => s + x.salk3, 0);
      return {
        ...prev,
        mbew: {
          ...prev.mbew,
          [activeWerks]: {
            ...existing,
            lbkum: totalQty,
            salk3: totalVal,
            verpr: totalQty > 0 ? Math.round((totalVal / totalQty) * (existing.peinh || 1)) : existing.verpr,
            splitValuations: nextSplit,
          },
        },
      };
    });
  };

  const handleExtendToOrgLevel = () => {
    const plantDef = data.plants.find((p) => p.werks === activeWerks) || data.plants[0];
    const slocDef =
      plantDef.storageLocations.find((s) => s.lgort === activeLgort) ||
      plantDef.storageLocations[0];
    const baseMarc = Object.values(draft.marc)[0];
    const baseMbew = Object.values(draft.mbew)[0];

    setDraft((prev) => {
      const next = structuredClone(prev);
      if (!next.marc[activeWerks]) {
        next.marc[activeWerks] = {
          ...(baseMarc || {
            ekgrp: 'P01',
            bstme: prev.mara.meins,
            ekwsl: 'Z001',
            kautb: false,
            webaz: 1,
            kordp: false,
            dismm: 'PD',
            dispo: 'M01',
            minbe: 100,
            disls: 'EX',
            bstmi: 10,
            bstma: 1000,
            bstfe: 100,
            eisbe: 50,
            beskz: 'F',
            plifz: 7,
            mtvfp: '02',
            sernp: '',
          }),
          werks: activeWerks,
          prctr: `PC-${activeWerks}`,
        };
      }
      if (!next.mard[activeMardKey]) {
        next.mard[activeMardKey] = {
          werks: activeWerks,
          lgort: activeLgort,
          lgobe: slocDef?.lgobe || `Storage ${activeLgort}`,
          lgpbe: `BIN-${activeLgort}-01`,
          labst: 0,
          insme: 0,
          speme: 0,
          raube: '01 - Normal Indoor',
          tempb: 'Ambient',
          maxlz: 365,
          mhdrz: 90,
          mhdhb: 365,
        };
      }
      if (!next.mbew[activeWerks]) {
        next.mbew[activeWerks] = {
          bwkey: activeWerks,
          bklas: baseMbew?.bklas || '3000',
          vprsv: baseMbew?.vprsv || 'V',
          verpr: baseMbew?.verpr || 10000,
          stprs: baseMbew?.stprs || 10000,
          peinh: baseMbew?.peinh || 1,
          waers: baseMbew?.waers || 'IDR',
          lbkum: 0,
          salk3: 0,
        };
      }
      return next;
    });
    setSuccessMsg(`Material berhasil di-extend ke Plant ${activeWerks} / Storage ${activeLgort}. Klik Simpan untuk menyimpan ke database.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorBanner(null);
    setSuccessMsg(null);
    const res = await onSaveMaterial(draft, mode === 'create', activeWerks);
    setSaving(false);
    if (!res.ok) {
      setErrorBanner(res.details && res.details.length > 0 ? res.details : [res.error || 'Gagal menyimpan material.']);
    } else {
      setSuccessMsg(
        mode === 'create'
          ? `Material ${draft.mara.matnr} berhasil dibuat (MM01) dan tercatat di CDHDR.`
          : `Perubahan Material ${draft.mara.matnr} berhasil disimpan (MM02) dan tercatat di CDHDR.`
      );
    }
  };

  const renderFieldLabel = (label: string, techName: string, status: FieldStatus) => (
    <div className="flex items-center justify-between gap-2 mb-1">
      <label className="text-xs font-medium text-slate-700">
        {label}
        {status === 'required' && <span className="text-red-600 ml-1 font-semibold">*</span>}
      </label>
      <span className="text-[11px] font-mono text-slate-400">{techName}</span>
    </div>
  );

  const renderCustomIndustryInput = (cf: CustomIndustryField) => {
    const disabled = isReadOnly || cf.status === 'display';
    const value = draft.industryExtensions?.[cf.fieldName];

    return (
      <div key={cf.id} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-800">
            {cf.label}
            {cf.status === 'required' && <span className="text-red-600 ml-1 font-semibold">*</span>}
          </label>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            {cf.status === 'display' && <Lock className="w-3 h-3" />}
            {cf.fieldName}
          </span>
        </div>

        {cf.dataType === 'select' ? (
          <select
            disabled={disabled}
            value={String(value ?? cf.defaultValue ?? '')}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                industryExtensions: { ...prev.industryExtensions, [cf.fieldName]: e.target.value },
              }))
            }
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#0064D9]"
          >
            <option value="">-- Pilih nilai --</option>
            {(cf.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : cf.dataType === 'boolean' ? (
          <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={Boolean(value)}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  industryExtensions: { ...prev.industryExtensions, [cf.fieldName]: e.target.checked },
                }))
              }
              className="w-4 h-4 accent-[#0064D9]"
            />
            <span className="text-xs font-medium text-slate-700">
              {Boolean(value) ? 'Aktif / Ya' : 'Tidak Aktif'}
            </span>
          </label>
        ) : cf.dataType === 'number' ? (
          <div className="flex items-center">
            <input
              type="number"
              step="any"
              disabled={disabled}
              value={value === undefined ? '' : Number(value)}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  industryExtensions: {
                    ...prev.industryExtensions,
                    [cf.fieldName]: e.target.value === '' ? '' : Number(e.target.value),
                  },
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#0064D9]"
            />
            {cf.unit && (
              <span className="ml-2 px-2.5 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-600 shrink-0">
                {cf.unit}
              </span>
            )}
          </div>
        ) : (
          <input
            type={cf.dataType === 'date' ? 'date' : 'text'}
            disabled={disabled}
            value={String(value ?? '')}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                industryExtensions: { ...prev.industryExtensions, [cf.fieldName]: e.target.value },
              }))
            }
            placeholder={cf.helpText}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#0064D9]"
          />
        )}
        <p className="text-[11px] text-slate-500">{cf.helpText}</p>
      </div>
    );
  };

  if (mode !== 'create' && data.materials.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
        <div className="text-sm font-semibold text-slate-900">
          Belum ada Material Master pada tenant {data.activeTenant.bukrs} ({data.activeTenant.name})
        </div>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Buat material pertama untuk sektor {data.activeTenant.coreBusiness} menggunakan transaksi MM01.
        </p>
        <button
          type="button"
          onClick={() => onModeChange('create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Material Baru (MM01)</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Top Transaction Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors mt-0.5"
              title="Kembali ke MM60"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#0064D9]">
                  {mode === 'create' ? 'MM01 · Create Material' : mode === 'edit' ? 'MM02 · Change Material' : 'MM03 · Display Material'}
                </span>
                <span className="text-slate-300">/</span>
                {mode !== 'create' && (
                  <select
                    value={draft.mara.matnr}
                    onChange={(e) => onSelectMaterial(e.target.value)}
                    aria-label="Pilih Material"
                    className="font-mono text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:border-[#0064D9]"
                  >
                    {data.materials.map((m) => (
                      <option key={m.mara.matnr} value={m.mara.matnr}>
                        {m.mara.matnr} — {m.mara.maktx.slice(0, 42)}
                      </option>
                    ))}
                  </select>
                )}
                {mode === 'create' && (
                  <span className="font-mono text-sm font-bold text-slate-900">{draft.mara.matnr}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {draft.mara.maktx || 'Material Master Baru — Lengkapi data master dan atribut spesifik industri'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== 'create' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => onModeChange('view')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    mode === 'view' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>MM03</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('edit')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    mode === 'edit' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>MM02</span>
                </button>
              </div>
            )}

            {mode !== 'create' && (
              <>
                <button
                  type="button"
                  onClick={() => onMmAction('me51n', draft.mara.matnr, activeWerks)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0064D9] hover:text-[#0064D9] rounded-md transition-colors whitespace-nowrap"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Buat PR (ME51N)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMmAction('me21n', draft.mara.matnr, activeWerks)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0064D9] hover:text-[#0064D9] rounded-md transition-colors whitespace-nowrap"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Buat PO (ME21N)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMmAction('migo', draft.mara.matnr, activeWerks)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0064D9] hover:text-[#0064D9] rounded-md transition-colors whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>MIGO</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMmAction('mmbe', draft.mara.matnr, activeWerks)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0064D9] hover:text-[#0064D9] rounded-md transition-colors whitespace-nowrap"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>MMBE</span>
                </button>
              </>
            )}

            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : mode === 'create' ? 'Simpan Material (MM01)' : 'Simpan Perubahan (MM02)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Organizational Levels & OMS9 Context Strip */}
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Industry Sector (MARA-MBRSH)
            </label>
            <select
              disabled={isReadOnly}
              value={draft.mara.mbrsh}
              onChange={(e) => handleIndustrySectorChange(e.target.value as IndustrySectorCode)}
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-900 disabled:opacity-75 focus:outline-none focus:border-[#0064D9]"
            >
              {data.industrySectors.map((ind) => (
                <option key={ind.mbrsh} value={ind.mbrsh}>
                  {ind.mbrsh} · {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Material Type (MARA-MTART)
            </label>
            <select
              disabled={mode !== 'create'}
              value={draft.mara.mtart}
              onChange={(e) => handleMaterialTypeChange(e.target.value as MaterialTypeCode)}
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-900 disabled:opacity-75 focus:outline-none focus:border-[#0064D9]"
            >
              {data.materialTypes.map((mt) => (
                <option key={mt.mtart} value={mt.mtart}>
                  {mt.mtart} · {mt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Organizational Level: Plant (WERKS)
            </label>
            <select
              value={activeWerks}
              onChange={(e) => {
                const nextW = e.target.value;
                setActiveWerks(nextW);
                const pDef = data.plants.find((p) => p.werks === nextW);
                if (pDef && pDef.storageLocations[0]) {
                  setActiveLgort(pDef.storageLocations[0].lgort);
                }
              }}
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#0064D9]"
            >
              {data.plants.map((p) => {
                const extended = Boolean(draft.marc[p.werks]);
                return (
                  <option key={p.werks} value={p.werks}>
                    {p.werks} · {p.city} {extended ? '(Extended)' : '(Belum Di-extend)'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Storage Location (LGORT)
            </label>
            <select
              value={activeLgort}
              onChange={(e) => setActiveLgort(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#0064D9]"
            >
              {currentPlantDef.storageLocations.map((s) => (
                <option key={s.lgort} value={s.lgort}>
                  {s.lgort} · {s.lgobe}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OMS9 Active Rule Context Line */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">Aturan OMS9 Aktif [{draft.mara.mbrsh}]:</span>
            <span>{oms9Summary.requiredCount} Wajib</span>
            <span aria-hidden="true">·</span>
            <span>{oms9Summary.displayCount} Read-Only</span>
            <span aria-hidden="true">·</span>
            <span>{oms9Summary.hideCount} Disembunyikan</span>
            <span aria-hidden="true">·</span>
            <span>{industryCustomFields.length} Field Kustom CI_MARA</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenCustomizing(draft.mara.mbrsh)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0064D9] hover:underline"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Atur Field Industri di OMS9</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {errorBanner && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800">
          <div className="flex items-center gap-2 font-semibold text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Validasi SAP / OMS9 Gagal</span>
          </div>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {errorBanner.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center gap-2 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Material Extension Prompt if Plant/SLoc not yet maintained */}
      {(!activeMarc || !activeMard || !activeMbew) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-900">
            <span className="font-semibold">
              Material belum di-maintain untuk Plant {activeWerks} / Storage {activeLgort}.
            </span>{' '}
            Di SAP S/4HANA, Anda perlu melakukan Extend Material Master ke Organizational Level tersebut sebelum melakukan pengadaan atau pergerakan stok.
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleExtendToOrgLevel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Extend ke {activeWerks} / {activeLgort}</span>
            </button>
          )}
        </div>
      )}

      {/* Main SAP View Tabs Container */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 flex overflow-x-auto gap-1">
          {VIEW_TABS.map((tab) => {
            const isActive = activeView === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveView(tab.key)}
                className={`px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[#0064D9] text-[#0064D9] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono text-slate-400">{tab.tableHint}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">

          {activeView === 'classification' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Karakteristik Material sesuai Master Characteristic (CT04 · {draft.mara.matkl})</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeMaterialGroup?.label || 'Material Group belum memiliki master karakteristik.'} — Format Short Name: {activeMaterialGroup?.characteristics.map((ch) => ch.label).join('-') || 'Belum ditentukan'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-semibold ${filledCharacteristicCount === requiredCharacteristicCount ? 'text-emerald-700' : 'text-amber-700'}`}>{filledCharacteristicCount}/{requiredCharacteristicCount} wajib terisi</span>
                  <button type="button" onClick={() => setManageCt04((value) => !value)} className="text-xs font-semibold text-[#0064D9] hover:underline">{manageCt04 ? 'Tutup Kelola CT04' : 'Kelola CT04'}</button>
                </div>
              </div>
              {activeMaterialGroup && activeMaterialGroup.characteristics.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Preview Short Name (Urutan #1–#{activeMaterialGroup.characteristics.length}): <strong className="font-mono text-slate-900">{generatedShortName || activeMaterialGroup.characteristics.map((ch) => ch.label).join('-')}</strong></div>
              )}
              {!activeMaterialGroup ? <p className="text-sm text-slate-500">Material Group {draft.mara.matkl} belum memiliki master CT04. Pilih Material Group lain atau buat konfigurasi CT04.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeMaterialGroup.characteristics.map((ch, index) => (
                    <div key={ch.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium text-slate-800">#{index + 1} {ch.label}{ch.required && <span className="ml-1 text-red-600">*</span>}</label>
                        <span className="text-[11px] font-mono text-slate-400">{ch.charName}</span>
                      </div>
                      {ch.dataType === 'select' ? (
                        <select disabled={isReadOnly} value={String(characteristicValues[ch.charName] ?? '')} onChange={(event) => updateCharacteristicValue(ch.charName, event.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md">
                          <option value="">-- Pilih nilai karakteristik --</option>
                          {(ch.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : ch.dataType === 'boolean' ? (
                        <input type="checkbox" disabled={isReadOnly} checked={Boolean(characteristicValues[ch.charName])} onChange={(event) => updateCharacteristicValue(ch.charName, event.target.checked)} />
                      ) : (
                        <input type={ch.dataType === 'number' ? 'number' : 'text'} disabled={isReadOnly} value={String(characteristicValues[ch.charName] ?? '')} onChange={(event) => updateCharacteristicValue(ch.charName, ch.dataType === 'number' ? Number(event.target.value) : event.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md" />
                      )}
                      <p className="text-[11px] text-slate-500">{ch.helpText}{ch.unit ? ` · ${ch.unit}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
              {manageCt04 && activeMaterialGroup && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Kelola Master Characteristic — {activeMaterialGroup.matkl}</h4>
                  {ct04Message && <p className="text-xs text-slate-700">{ct04Message}</p>}
                  {activeMaterialGroup.characteristics.map((ch) => (
                    <div key={ch.id} className="flex flex-col md:flex-row gap-2 md:items-center">
                      <div className="min-w-0 flex-1"><span className="font-mono text-xs">{ch.charName}</span><span className="ml-2 text-xs">{ch.label}</span></div>
                      <button type="button" onClick={() => deleteCt04Characteristic(ch.id)} className="text-xs text-red-600 hover:underline">Hapus</button>
                    </div>
                  ))}
                  <form onSubmit={addCt04Characteristic} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input required value={newCharName} onChange={(event) => setNewCharName(event.target.value.toUpperCase())} placeholder="CHR_KODE" className="px-3 py-2 text-xs border rounded-md" />
                    <input required value={newCharLabel} onChange={(event) => setNewCharLabel(event.target.value)} placeholder="Nama karakteristik" className="px-3 py-2 text-xs border rounded-md" />
                    <input required value={newCharOptions} onChange={(event) => setNewCharOptions(event.target.value)} placeholder="Pilihan dipisah koma" className="px-3 py-2 text-xs border rounded-md" />
                    <button type="submit" className="md:col-span-3 px-3 py-2 text-xs font-semibold text-white bg-[#0064D9] rounded-md">Tambah Karakteristik Dropdown</button>
                  </form>
                  <p className="text-[11px] text-slate-500">Perubahan master berlaku untuk tenant/perusahaan aktif dan tidak mengubah nilai karakteristik material yang sudah tersimpan.</p>
                </div>
              )}
            </div>
          )}

          {/* VIEW 1: BASIC DATA 1 & 2 */}
          {activeView === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                {renderFieldLabel('Material Number', 'MARA-MATNR', 'required')}
                <input
                  type="text"
                  disabled={mode !== 'create'}
                  value={draft.mara.matnr}
                  onChange={(e) => updateMara('matnr', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#0064D9]"
                />
              </div>

              <div className="md:col-span-2">
                {renderFieldLabel('Material Description', 'MARA-MAKTX', 'required')}
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={draft.mara.maktx}
                  onChange={(e) => updateMara('maktx', e.target.value)}
                  placeholder="Deskripsi material (maks. 40 karakter SAP atau Long Text)"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                />
              </div>

              <div>
                {renderFieldLabel('Base Unit of Measure', 'MARA-MEINS', 'required')}
                <select
                  disabled={isReadOnly}
                  value={draft.mara.meins}
                  onChange={(e) => updateMara('meins', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                >
                  <option value="KG">KG — Kilogram</option>
                  <option value="PC">PC — Piece / Unit</option>
                  <option value="L">L — Liter</option>
                  <option value="M">M — Meter</option>
                  <option value="BOX">BOX — Carton / Box</option>
                  <option value="DRM">DRM — Drum</option>
                  <option value="TON">TON — Metric Ton</option>
                </select>
              </div>

              <div>
                {renderFieldLabel('Material Group', 'MARA-MATKL', 'required')}
                <select
                  disabled={isReadOnly}
                  value={draft.mara.matkl}
                  onChange={(e) => updateMara('matkl', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                >
                  {materialGroups.map((group) => <option key={group.matkl} value={group.matkl}>{group.matkl} — {group.label}</option>)}
                  {!materialGroups.some((group) => group.matkl === draft.mara.matkl) && <option value={draft.mara.matkl}>{draft.mara.matkl}</option>}
                </select>
              </div>

              <div>
                {renderFieldLabel('X-Plant Material Status', 'MARA-MSTAE', 'optional')}
                <select
                  disabled={isReadOnly}
                  value={draft.mara.mstae}
                  onChange={(e) => updateMara('mstae', e.target.value as MaterialMasterRecord['mara']['mstae'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                >
                  <option value="">Active (Tidak Diblokir)</option>
                  <option value="01">01 — Blocked for Procurement</option>
                  <option value="02">02 — Blocked for All Transactions</option>
                  <option value="Z1">Z1 — Obsolete / Phase Out</option>
                </select>
              </div>

              {getStandardStatus('bismt') !== 'hide' && (
                <div>
                  {renderFieldLabel('Old Material Number', 'MARA-BISMT', getStandardStatus('bismt'))}
                  <input
                    type="text"
                    disabled={isReadOnly || getStandardStatus('bismt') === 'display'}
                    value={draft.mara.bismt}
                    onChange={(e) => updateMara('bismt', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>
              )}

              {getStandardStatus('brgew') !== 'hide' && (
                <div>
                  {renderFieldLabel('Gross Weight', 'MARA-BRGEW', getStandardStatus('brgew'))}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly || getStandardStatus('brgew') === 'display'}
                      value={draft.mara.brgew}
                      onChange={(e) => updateMara('brgew', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={draft.mara.gewei}
                      onChange={(e) => updateMara('gewei', e.target.value.toUpperCase())}
                      className="w-20 px-2.5 py-2 text-sm font-mono text-center bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                    />
                  </div>
                </div>
              )}

              <div>
                {renderFieldLabel('Net Weight', 'MARA-NTGEW', 'optional')}
                <input
                  type="number"
                  step="0.01"
                  disabled={isReadOnly}
                  value={draft.mara.ntgew}
                  onChange={(e) => updateMara('ntgew', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                />
              </div>

              {getStandardStatus('groes') !== 'hide' && (
                <div>
                  {renderFieldLabel('Size / Dimensions', 'MARA-GROES', getStandardStatus('groes'))}
                  <input
                    type="text"
                    disabled={isReadOnly || getStandardStatus('groes') === 'display'}
                    value={draft.mara.groes}
                    onChange={(e) => updateMara('groes', e.target.value)}
                    placeholder="mis. 180 x 120 x 45 mm"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>
              )}

              {getStandardStatus('ean11') !== 'hide' && (
                <div>
                  {renderFieldLabel('EAN / GTIN Barcode', 'MARA-EAN11', getStandardStatus('ean11'))}
                  <input
                    type="text"
                    disabled={isReadOnly || getStandardStatus('ean11') === 'display'}
                    value={draft.mara.ean11}
                    onChange={(e) => updateMara('ean11', e.target.value)}
                    placeholder="899xxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>
              )}

              <div>
                {renderFieldLabel('Volume & Unit', 'MARA-VOLUM', 'optional')}
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    disabled={isReadOnly}
                    value={draft.mara.volum}
                    onChange={(e) => updateMara('volum', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={draft.mara.voleh}
                    onChange={(e) => updateMara('voleh', e.target.value.toUpperCase())}
                    className="w-20 px-2.5 py-2 text-sm font-mono text-center bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: PURCHASING */}
          {activeView === 'purchasing' && (
            activeMarc ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  {renderFieldLabel('Purchasing Group', 'MARC-EKGRP', 'required')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.ekgrp}
                    onChange={(e) => updateMarc('ekgrp', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="P01">P01 — Bahan Aktif &amp; Farmasi</option>
                    <option value="P02">P02 — Kimia &amp; Bahan B3</option>
                    <option value="P03">P03 — Logam &amp; Mekanikal</option>
                    <option value="P04">P04 — Agribisnis &amp; Pangan</option>
                    <option value="P05">P05 — Ritel &amp; Elektronik</option>
                    <option value="P06">P06 — Energi &amp; MRO</option>
                  </select>
                </div>

                <div>
                  {renderFieldLabel('Order Unit', 'MARA-BSTME', 'optional')}
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={activeMarc.bstme}
                    onChange={(e) => updateMarc('bstme', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>

                <div>
                  {renderFieldLabel('Purchasing Value Key', 'MARA-EKWSL', 'optional')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.ekwsl}
                    onChange={(e) => updateMarc('ekwsl', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="Z001">Z001 — Toleransi ±5% / Reminder 7d</option>
                    <option value="Z002">Z002 — Toleransi ±2% / COA Wajib</option>
                    <option value="Z003">Z003 — Toleransi 0% / Strict GR</option>
                  </select>
                </div>

                <div>
                  {renderFieldLabel('GR Processing Time (Hari)', 'MARC-WEBAZ', 'optional')}
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={activeMarc.webaz}
                    onChange={(e) => updateMarc('webaz', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>

                {getStandardStatus('xchpf') !== 'hide' && (
                  <div>
                    {renderFieldLabel('Batch Management', 'MARA-XCHPF', getStandardStatus('xchpf'))}
                    <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                      <input
                        type="checkbox"
                        disabled={isReadOnly || getStandardStatus('xchpf') === 'display'}
                        checked={draft.mara.xchpf}
                        onChange={(e) => updateMara('xchpf', e.target.checked)}
                        className="w-4 h-4 accent-[#0064D9]"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {draft.mara.xchpf ? 'Batch Management Aktif' : 'Non-Batch'}
                      </span>
                    </label>
                  </div>
                )}

                {getStandardStatus('kautb') !== 'hide' && (
                  <div>
                    {renderFieldLabel('Automatic PO Allowed', 'MARC-KAUTB', getStandardStatus('kautb'))}
                    <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                      <input
                        type="checkbox"
                        disabled={isReadOnly || getStandardStatus('kautb') === 'display'}
                        checked={activeMarc.kautb}
                        onChange={(e) => updateMarc('kautb', e.target.checked)}
                        className="w-4 h-4 accent-[#0064D9]"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {activeMarc.kautb ? 'Izinkan Auto-PO dari PR (ME59N)' : 'Manual PO'}
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  {renderFieldLabel('Source List Requirement', 'MARC-KORDP', 'optional')}
                  <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={activeMarc.kordp}
                      onChange={(e) => updateMarc('kordp', e.target.checked)}
                      className="w-4 h-4 accent-[#0064D9]"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      {activeMarc.kordp ? 'Wajib Source List (ME01)' : 'Opsional'}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Silakan extend material ke Plant {activeWerks} untuk melihat dan mengubah data Purchasing.
              </div>
            )
          )}

          {/* VIEW 3: MRP 1-4 */}
          {activeView === 'mrp' && (
            activeMarc ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  {renderFieldLabel('MRP Type', 'MARC-DISMM', 'required')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.dismm}
                    onChange={(e) => updateMarc('dismm', e.target.value as MarcPlantData['dismm'])}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="PD">PD — MRP (Deterministic)</option>
                    <option value="VB">VB — Manual Reorder Point Planning</option>
                    <option value="VV">VV — Forecast-Based Planning</option>
                    <option value="ND">ND — No MRP Planning</option>
                  </select>
                </div>

                <div>
                  {renderFieldLabel('MRP Controller', 'MARC-DISPO', 'required')}
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={activeMarc.dispo}
                    onChange={(e) => updateMarc('dispo', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>

                <div>
                  {renderFieldLabel('Reorder Point', 'MARC-MINBE', 'optional')}
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={activeMarc.minbe}
                    onChange={(e) => updateMarc('minbe', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>

                <div>
                  {renderFieldLabel('Lot Sizing Procedure', 'MARC-DISLS', 'required')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.disls}
                    onChange={(e) => updateMarc('disls', e.target.value as MarcPlantData['disls'])}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="EX">EX — Lot-for-Lot Order Quantity</option>
                    <option value="FX">FX — Fixed Order Quantity</option>
                    <option value="HB">HB — Replenish to Maximum Stock Level</option>
                  </select>
                </div>

                <div>
                  {renderFieldLabel('Procurement Type', 'MARC-BESKZ', 'required')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.beskz}
                    onChange={(e) => updateMarc('beskz', e.target.value as MarcPlantData['beskz'])}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="F">F — External Procurement (Beli)</option>
                    <option value="E">E — In-House Production (Produksi)</option>
                    <option value="X">X — Both External &amp; In-House</option>
                  </select>
                </div>

                {getStandardStatus('eisbe') !== 'hide' && (
                  <div>
                    {renderFieldLabel('Safety Stock', 'MARC-EISBE', getStandardStatus('eisbe'))}
                    <input
                      type="number"
                      disabled={isReadOnly || getStandardStatus('eisbe') === 'display'}
                      value={activeMarc.eisbe}
                      onChange={(e) => updateMarc('eisbe', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>
                )}

                <div>
                  {renderFieldLabel('Planned Delivery Time (Hari)', 'MARC-PLIFZ', 'optional')}
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={activeMarc.plifz}
                    onChange={(e) => updateMarc('plifz', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  />
                </div>

                <div>
                  {renderFieldLabel('Min / Max Lot Size', 'MARC-BSTMI / BSTMA', 'optional')}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={activeMarc.bstmi}
                      onChange={(e) => updateMarc('bstmi', Number(e.target.value))}
                      placeholder="Min"
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={activeMarc.bstma}
                      onChange={(e) => updateMarc('bstma', Number(e.target.value))}
                      placeholder="Max"
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>
                </div>

                <div>
                  {renderFieldLabel('Availability Check', 'MARC-MTVFP', 'optional')}
                  <select
                    disabled={isReadOnly}
                    value={activeMarc.mtvfp}
                    onChange={(e) => updateMarc('mtvfp', e.target.value as MarcPlantData['mtvfp'])}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                  >
                    <option value="01">01 — Daily Requirements</option>
                    <option value="02">02 — Individual Requirements</option>
                    <option value="KP">KP — No Check</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Silakan extend material ke Plant {activeWerks} untuk mengakses MRP 1–4.
              </div>
            )
          )}

          {/* VIEW 4: PLANT DATA / STORAGE */}
          {activeView === 'storage' && (
            activeMard && activeMarc ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Unrestricted Stock (MARD-LABST)</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {formatNumber(activeMard.labst)} {draft.mara.meins}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Quality Inspection (MARD-INSME)</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                      {formatNumber(activeMard.insme)} {draft.mara.meins}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Blocked Stock (MARD-SPEME)</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-red-700 mt-0.5">
                      {formatNumber(activeMard.speme)} {draft.mara.meins}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    {renderFieldLabel('Storage Bin', 'MARD-LGPBE', 'optional')}
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={activeMard.lgpbe}
                      onChange={(e) => updateMard('lgpbe', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>

                  <div>
                    {renderFieldLabel('Storage Conditions', 'MARA-RAUBE', 'optional')}
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={activeMard.raube}
                      onChange={(e) => updateMard('raube', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>

                  {getStandardStatus('tempb') !== 'hide' && (
                    <div>
                      {renderFieldLabel('Temperature Conditions', 'MARD-TEMPB', getStandardStatus('tempb'))}
                      <input
                        type="text"
                        disabled={isReadOnly || getStandardStatus('tempb') === 'display'}
                        value={activeMard.tempb}
                        onChange={(e) => updateMard('tempb', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                      />
                    </div>
                  )}

                  {getStandardStatus('mhdrz') !== 'hide' && (
                    <div>
                      {renderFieldLabel('Min. Remaining Shelf Life (Hari)', 'MARD-MHDRZ', getStandardStatus('mhdrz'))}
                      <input
                        type="number"
                        disabled={isReadOnly || getStandardStatus('mhdrz') === 'display'}
                        value={activeMard.mhdrz}
                        onChange={(e) => updateMard('mhdrz', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                      />
                    </div>
                  )}

                  <div>
                    {renderFieldLabel('Total Shelf Life (Hari)', 'MARA-MHDHB', 'optional')}
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={activeMard.mhdhb}
                      onChange={(e) => updateMard('mhdhb', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>

                  <div>
                    {renderFieldLabel('Profit Center', 'MARC-PRCTR', 'optional')}
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={activeMarc.prctr}
                      onChange={(e) => updateMarc('prctr', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>

                  {getStandardStatus('sernp') !== 'hide' && (
                    <div>
                      {renderFieldLabel('Serial Number Profile', 'MARC-SERNP', getStandardStatus('sernp'))}
                      <input
                        type="text"
                        disabled={isReadOnly || getStandardStatus('sernp') === 'display'}
                        value={activeMarc.sernp}
                        onChange={(e) => updateMarc('sernp', e.target.value.toUpperCase())}
                        placeholder="mis. ZSER"
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Extend material ke Plant {activeWerks} &amp; Storage Location {activeLgort} untuk mengelola penyimpanan.
              </div>
            )
          )}

          {/* VIEW 5: ACCOUNTING 1 */}
          {activeView === 'accounting' && (
            activeMbew ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Total Valuated Stock (MBEW-LBKUM)</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {formatNumber(activeMbew.lbkum)} {draft.mara.meins}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Total Value (MBEW-SALK3)</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {formatCurrency(activeMbew.salk3, activeMbew.waers)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Harga Valuasi Aktif ({activeMbew.vprsv})</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0064D9] mt-0.5">
                      {formatCurrency(activeMbew.vprsv === 'V' ? activeMbew.verpr : activeMbew.stprs, activeMbew.waers)} / {activeMbew.peinh} {draft.mara.meins}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {getStandardStatus('bwtty') !== 'hide' && (
                    <div>
                      {renderFieldLabel(
                        'Valuation Category (Split Val.)',
                        'MBEW-BWTTY',
                        getStandardStatus('bwtty')
                      )}
                      <select
                        disabled={isReadOnly || getStandardStatus('bwtty') === 'display'}
                        value={activeMbew.bwtty || ''}
                        onChange={(e) =>
                          handleValuationCategoryChange(e.target.value as ValuationCategoryCode)
                        }
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                      >
                        <option value="">None — Single Valuation</option>
                        <option value="Z">Z — Full Split (LOCAL, IMPORT, FREE, OLD)</option>
                        <option value="H">H — Origin (LOCAL / IMPORT)</option>
                        <option value="C">C — Condition (FREE / OLD)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    {renderFieldLabel('Valuation Class', 'MBEW-BKLAS', 'required')}
                    <select
                      disabled={isReadOnly}
                      value={activeMbew.bklas}
                      onChange={(e) => updateMbew('bklas', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    >
                      <option value="3000">3000 — Raw Materials (GL 140100)</option>
                      <option value="3040">3040 — Spare Parts / MRO (GL 140200)</option>
                      <option value="3050">3050 — Packaging Materials (GL 140300)</option>
                      <option value="3100">3100 — Trading Goods (GL 141000)</option>
                      <option value="7900">7900 — Semi-Finished Goods (GL 142000)</option>
                      <option value="7920">7920 — Finished Goods (GL 143000)</option>
                    </select>
                  </div>

                  <div>
                    {renderFieldLabel('Price Control', 'MBEW-VPRSV', 'required')}
                    <select
                      disabled={isReadOnly}
                      value={activeMbew.vprsv}
                      onChange={(e) => updateMbew('vprsv', e.target.value as 'V' | 'S')}
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    >
                      <option value="V">V — Moving Average Price (MAP)</option>
                      <option value="S">S — Standard Price</option>
                    </select>
                  </div>

                  <div>
                    {renderFieldLabel('Price Unit & Currency', 'MBEW-PEINH / WAERS', 'required')}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        disabled={isReadOnly}
                        value={activeMbew.peinh}
                        onChange={(e) => updateMbew('peinh', Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                      />
                      <select
                        disabled={isReadOnly}
                        value={activeMbew.waers}
                        onChange={(e) => updateMbew('waers', e.target.value)}
                        className="w-24 px-2 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                      >
                        <option value="IDR">IDR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    {renderFieldLabel('Moving Average Price', 'MBEW-VERPR', 'optional')}
                    <input
                      type="number"
                      disabled={isReadOnly || activeMbew.vprsv === 'S' || Boolean(activeMbew.bwtty)}
                      value={activeMbew.verpr}
                      onChange={(e) => updateMbew('verpr', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>

                  <div>
                    {renderFieldLabel('Standard Price', 'MBEW-STPRS', 'optional')}
                    <input
                      type="number"
                      disabled={isReadOnly || activeMbew.vprsv === 'V'}
                      value={activeMbew.stprs}
                      onChange={(e) => updateMbew('stprs', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-[#0064D9]"
                    />
                  </div>
                </div>

                {/* Split Valuation Types Matrix (MBEW-BWTAR: LOCAL, IMPORT, FREE, OLD) */}
                {activeMbew.bwtty && (
                  <div className="pt-5 border-t border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Split Valuation Types (MBEW-BWTAR · Plant {activeWerks})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Aktifkan dan kelola harga/valuasi terpisah untuk LOCAL, IMPORT, FREE, dan OLD. Header Plant otomatis menghitung rata-rata tertimbang.
                        </p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['LOCAL', 'IMPORT', 'FREE', 'OLD'] as ValuationTypeCode[]).map((vt) => {
                            const active = Boolean(activeMbew.splitValuations?.[vt]);
                            const hasStock = (activeMbew.splitValuations?.[vt]?.lbkum || 0) > 0;
                            return (
                              <button
                                key={vt}
                                type="button"
                                disabled={active && hasStock}
                                onClick={() => toggleSplitValuationType(vt)}
                                title={
                                  active && hasStock
                                    ? 'Tidak dapat dinonaktifkan karena masih memiliki stok'
                                    : active
                                    ? `Nonaktifkan ${vt}`
                                    : `Aktifkan ${vt}`
                                }
                                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                                  active
                                    ? 'bg-[#EAF2FD] border-[#0064D9] text-[#0064D9]'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                                } disabled:opacity-75`}
                              >
                                {active ? `✓ ${vt}` : `+ ${vt}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                            <th className="py-2.5 px-4">Valuation Type (BWTAR)</th>
                            <th className="py-2.5 px-4">Val. Class</th>
                            <th className="py-2.5 px-4">Price Ctrl</th>
                            <th className="py-2.5 px-4 text-right">Harga Unit ({activeMbew.waers})</th>
                            <th className="py-2.5 px-4 text-right">Stok (LBKUM)</th>
                            <th className="py-2.5 px-4 text-right">Total Nilai (SALK3)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(['LOCAL', 'IMPORT', 'FREE', 'OLD'] as ValuationTypeCode[])
                            .filter((vt) => Boolean(activeMbew.splitValuations?.[vt]))
                            .map((vt) => {
                              const row = activeMbew.splitValuations![vt]!;
                              const vtDef = data.valuationTypes?.find((d) => d.bwtar === vt);
                              return (
                                <tr key={vt} className="hover:bg-slate-50/80">
                                  <td className="py-3 px-4">
                                    <div className="font-mono font-bold text-[#0064D9]">{vt}</div>
                                    <div className="text-[11px] text-slate-500">
                                      {vtDef?.label || vt}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      disabled={isReadOnly}
                                      value={row.bklas}
                                      onChange={(e) => updateSplitValuationItem(vt, 'bklas', e.target.value)}
                                      className="w-20 px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      disabled={isReadOnly}
                                      value={row.vprsv}
                                      onChange={(e) =>
                                        updateSplitValuationItem(vt, 'vprsv', e.target.value as 'V' | 'S')
                                      }
                                      className="px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded disabled:bg-slate-100"
                                    >
                                      <option value="V">V (MAP)</option>
                                      <option value="S">S (Std)</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <input
                                      type="number"
                                      disabled={isReadOnly || vt === 'FREE'}
                                      value={row.vprsv === 'V' ? row.verpr : row.stprs}
                                      onChange={(e) =>
                                        updateSplitValuationItem(
                                          vt,
                                          row.vprsv === 'V' ? 'verpr' : 'stprs',
                                          Math.max(0, Number(e.target.value))
                                        )
                                      }
                                      className="w-32 px-2 py-1 text-right text-xs font-mono tabular-nums bg-white border border-slate-200 rounded disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                    {formatNumber(row.lbkum)} {draft.mara.meins}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                    {formatCurrency(row.salk3, activeMbew.waers)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Integrasi MM-FI: Saat posting Goods Receipt (MIGO 101), sistem otomatis menghitung ulang Moving Average Price (VERPR) per Valuation Type (LOCAL / IMPORT / FREE / OLD) jika Split Valuation aktif, atau langsung di Header MBEW.
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Extend material ke Plant {activeWerks} untuk melihat data valuasi MBEW.
              </div>
            )
          )}

          {/* VIEW 6: SALES ORG */}
          {activeView === 'sales' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                {renderFieldLabel('Sales Organization', 'MVKE-VKORG', 'optional')}
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={draft.mvke.vkorg}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mvke: { ...p.mvke, vkorg: e.target.value } }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                {renderFieldLabel('Distribution Channel', 'MVKE-VTWEG', 'optional')}
                <select
                  disabled={isReadOnly}
                  value={draft.mvke.vtweg}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mvke: { ...p.mvke, vtweg: e.target.value } }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                >
                  <option value="10">10 — Direct B2B / Industrial</option>
                  <option value="20">20 — Distributor &amp; Retail</option>
                  <option value="30">30 — Export Sales</option>
                </select>
              </div>
              <div>
                {renderFieldLabel('Delivering Plant', 'MVKE-DWERK', 'optional')}
                <select
                  disabled={isReadOnly}
                  value={draft.mvke.dwerk}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mvke: { ...p.mvke, dwerk: e.target.value } }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                >
                  {data.plants.map((p) => (
                    <option key={p.werks} value={p.werks}>
                      {p.werks} · {p.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {renderFieldLabel('Tax Classification (PPN)', 'MLAN-TAXKM', 'optional')}
                <select
                  disabled={isReadOnly}
                  value={draft.mvke.taxkm}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mvke: { ...p.mvke, taxkm: e.target.value as '0' | '1' } }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                >
                  <option value="1">1 — Kena PPN (Taxable)</option>
                  <option value="0">0 — Bebas PPN (Tax Exempt)</option>
                </select>
              </div>
              <div>
                {renderFieldLabel('Item Category Group', 'MVKE-MTPOS', 'optional')}
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={draft.mvke.mtpos}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mvke: { ...p.mvke, mtpos: e.target.value.toUpperCase() } }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                {renderFieldLabel('Transportation / Loading Group', 'MARA-TRAGR / LADGR', 'optional')}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={draft.mvke.tragr}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, mvke: { ...p.mvke, tragr: e.target.value } }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={draft.mvke.ladgr}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, mvke: { ...p.mvke, ladgr: e.target.value } }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: INDUSTRY-SPECIFIC APPEND FIELDS (CI_MARA) */}
          {activeView === 'industry' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Append Structure CI_MARA ·{' '}
                    {data.industrySectors.find((i) => i.mbrsh === draft.mara.mbrsh)?.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.industrySectors.find((i) => i.mbrsh === draft.mara.mbrsh)?.regulatoryContext}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCustomizing(draft.mara.mbrsh)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0064D9] bg-[#EAF2FD] hover:bg-[#dceafb] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Tambah / Ubah Field di OMS9</span>
                </button>
              </div>

              {industryCustomFields.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Belum ada field kustom aktif untuk sektor industri {draft.mara.mbrsh}. Tambahkan melalui transaksi OMS9.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {industryCustomFields.map((cf) => renderCustomIndustryInput(cf))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Delete / Audit Metadata */}
        {mode !== 'create' && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Dibuat oleh <span className="font-mono text-slate-700">{draft.mara.createdBy}</span> · Terakhir diperbarui{' '}
              <span className="font-mono text-slate-700">{new Date(draft.mara.updatedAt).toLocaleString('id-ID')}</span>
            </div>
            {!isReadOnly && (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Material</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-red-700 font-medium">Konfirmasi hapus {draft.mara.matnr}?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await onDeleteMaterial(draft.mara.matnr);
                        if (!res.ok) {
                          setErrorBanner([res.error || 'Gagal menghapus material.']);
                          setConfirmDelete(false);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
