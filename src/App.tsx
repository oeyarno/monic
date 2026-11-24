import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { CoaReferenceView } from './components/CoaReferenceView.tsx';
import { IndustryCustomizingView } from './components/IndustryCustomizingView.tsx';
import { MaterialListView } from './components/MaterialListView.tsx';
import { MaterialMasterEditor } from './components/MaterialMasterEditor.tsx';
import { MmIntegrationView } from './components/MmIntegrationView.tsx';
import { type ActiveRoute, Sidebar } from './components/Sidebar.tsx';
import { TenantManagementView } from './components/TenantManagementView.tsx';
import type {
  CustomIndustryField,
  IndustrySectorCode,
  MasterCharacteristic,
  MaterialMasterRecord,
  MaterialSearchDictionaryEntry,
  MaterialTypeCode,
  MovementTypeCode,
  PlantDefinition,
  SapBootstrapPayload,
  StandardFieldRule,
  TenantCoreBusinessType,
  UnitOfMeasureDefinition,
  UomDimension,
  ValuationTypeCode,
} from './types/sap.ts';

const ROUTE_BREADCRUMBS: Record<ActiveRoute, { section: string; title: string }> = {
  mm60: { section: 'Material Master', title: 'MM60 · Daftar Material Master' },
  mm02: { section: 'Material Master', title: 'MM02 / MM03 · Kelola Material Master' },
  mm01: { section: 'Material Master', title: 'MM01 · Buat Material Baru' },
  me51n: { section: 'Materials Management (MM)', title: 'ME51N · Purchase Requisition' },
  me21n: { section: 'Materials Management (MM)', title: 'ME21N · Purchase Order' },
  migo: { section: 'Materials Management (MM)', title: 'MIGO · Goods Movement & Valuasi' },
  mmbe: { section: 'Materials Management (MM)', title: 'MMBE · Stock Overview' },
  ox02: { section: 'SPRO & Tata Kelola', title: 'OX02 · Multi-Tenant Company & Core Business' },
  coa: { section: 'SPRO & Tata Kelola', title: 'COA · Master Chart of Accounts' },
  oms9: { section: 'SPRO Customizing', title: 'OMS9 · Kustomisasi Field & Master HAWA' },
  cdhdr: { section: 'Tata Kelola', title: 'CDHDR · Change Documents & Audit Trail' },
};

const TENANT_STORAGE_KEY = 'sap_active_tenant_id';

export default function App() {
  const [data, setData] = useState<SapBootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    try {
      return localStorage.getItem(TENANT_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('mm60');
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'view'>('edit');
  const [selectedMatnr, setSelectedMatnr] = useState<string | undefined>(undefined);
  const [mmPreselectMatnr, setMmPreselectMatnr] = useState<string | undefined>(undefined);
  const [mmPreselectWerks, setMmPreselectWerks] = useState<string | undefined>(undefined);
  const [customizingIndustry, setCustomizingIndustry] = useState<IndustrySectorCode | undefined>(undefined);
  const [customizingSubTab, setCustomizingSubTab] = useState<'oms9' | 'append' | 'ct04' | 'cuni'>('oms9');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const buildHeaders = useCallback(
    (includeJson = true, tenantOverride?: string): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (includeJson) headers['Content-Type'] = 'application/json';
      const tid = tenantOverride || data?.activeTenant.tenantId || activeTenantId;
      if (tid) headers['X-Tenant-Id'] = tid;
      return headers;
    },
    [data?.activeTenant.tenantId, activeTenantId]
  );

  const applyBootstrapPayload = useCallback((payload: SapBootstrapPayload, resetSelections = false) => {
    setData(payload);
    setActiveTenantId(payload.activeTenant.tenantId);
    try {
      localStorage.setItem(TENANT_STORAGE_KEY, payload.activeTenant.tenantId);
    } catch {
      // ignore storage quota errors
    }
    if (resetSelections) {
      setSelectedMatnr(payload.materials[0]?.mara.matnr);
      setMmPreselectMatnr(undefined);
      setMmPreselectWerks(undefined);
      setCustomizingIndustry(payload.activeTenant.defaultIndustry);
    }
  }, []);

  const fetchBootstrap = useCallback(
    async (tenantOverride?: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const targetTid = tenantOverride ?? activeTenantId;
        const url = targetTid
          ? `/api/bootstrap?tenantId=${encodeURIComponent(targetTid)}`
          : '/api/bootstrap';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal memuat data SAP S/4HANA dari server.');
        const payload = (await res.json()) as SapBootstrapPayload;
        applyBootstrapPayload(payload, true);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    },
    [activeTenantId, applyBootstrapPayload]
  );

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (!tenantId || tenantId === data?.activeTenant.tenantId) return;
    try {
      const res = await fetch(`/api/bootstrap?tenantId=${encodeURIComponent(tenantId)}`);
      if (!res.ok) throw new Error('Gagal beralih tenant.');
      const payload = (await res.json()) as SapBootstrapPayload;
      applyBootstrapPayload(payload, true);
      if (activeRoute === 'mm01' || activeRoute === 'mm02') {
        setActiveRoute('mm60');
      }
      showToast(`Tenant aktif: ${payload.activeTenant.bukrs} · ${payload.activeTenant.name} (${payload.activeTenant.coreBusiness})`);
    } catch {
      showToast('Gagal memuat data perusahaan tenant yang dipilih.');
    }
  };

  const handleCreateTenant = async (payload: {
    bukrs: string;
    name: string;
    coreBusinessType: TenantCoreBusinessType;
    city: string;
  }) => {
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error };
      const fresh = json as SapBootstrapPayload;
      applyBootstrapPayload(fresh, true);
      showToast(`Tenant baru ${fresh.activeTenant.bukrs} (${fresh.activeTenant.name}) siap digunakan.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
        method: 'DELETE',
        headers: buildHeaders(false),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error };
      const fresh = json as SapBootstrapPayload;
      applyBootstrapPayload(fresh, true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleSavePlant = async (plant: PlantDefinition, originalWerks?: string) => {
    try {
      const res = await fetch(
        originalWerks
          ? `/api/plants/${encodeURIComponent(originalWerks)}`
          : '/api/plants',
        {
          method: originalWerks ? 'PUT' : 'POST',
          headers: buildHeaders(true),
          body: JSON.stringify(plant),
        }
      );
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error as string | undefined };
      setData(json.db as SapBootstrapPayload);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleDeletePlant = async (werks: string) => {
    try {
      const res = await fetch(`/api/plants/${encodeURIComponent(werks)}`, {
        method: 'DELETE',
        headers: buildHeaders(false),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error as string | undefined };
      setData(json.db as SapBootstrapPayload);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleNavigate = (route: ActiveRoute) => {
    setActiveRoute(route);
    if (route === 'mm01') {
      setEditorMode('create');
    } else if (route === 'mm02') {
      setEditorMode('edit');
    }
  };

  const handleTcodeJump = (raw: string) => {
    const code = raw.replace(/^\/n/i, '').trim().toLowerCase();
    const map: Record<string, ActiveRoute> = {
      mm60: 'mm60',
      mm01: 'mm01',
      mm02: 'mm02',
      mm03: 'mm02',
      me51n: 'me51n',
      me21n: 'me21n',
      migo: 'migo',
      mb51: 'migo',
      mmbe: 'mmbe',
      ox02: 'ox02',
      coa: 'coa',
      oms9: 'oms9',
      oms3: 'oms9',
      omsf: 'oms9',
      ct04: 'oms9',
      t023: 'oms9',
      cuni: 'oms9',
      t006: 'oms9',
      spro: 'oms9',
      cdhdr: 'cdhdr',
      cdpos: 'cdhdr',
    };
    const target = map[code];
    if (!target) {
      showToast(`T-Code "${raw.toUpperCase()}" tidak dikenali. Gunakan MM60, MM01, MM02, ME51N, ME21N, MIGO, MMBE, OX02, COA, OMS9, CT04, CUNI, atau CDHDR.`);
      return;
    }
    if (code === 'cuni' || code === 't006') {
      setCustomizingSubTab('cuni');
    } else if (code === 'ct04' || code === 't023' || code === 'omsf') {
      setCustomizingSubTab('ct04');
    } else if (target === 'oms9') {
      setCustomizingSubTab('oms9');
    }
    if (code === 'mm03') {
      setActiveRoute('mm02');
      setEditorMode('view');
    } else {
      handleNavigate(target);
    }
  };

  const handleSaveMaterial = async (
    material: MaterialMasterRecord,
    isCreate: boolean,
    activeWerks: string,
    autoGenerateMaktx = false
  ) => {
    try {
      const url = isCreate ? '/api/materials' : `/api/materials/${material.mara.matnr}`;
      const method = isCreate ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: buildHeaders(true),
        body: JSON.stringify({ material, activeWerks, autoGenerateMaktx }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error, details: json.details };
      }
      setData(json.db);
      const savedMatnr = json.material?.mara?.matnr || material.mara.matnr;
      setSelectedMatnr(savedMatnr);
      if (isCreate) {
        setEditorMode('edit');
        setActiveRoute('mm02');
      }
      return { ok: true, matnr: savedMatnr };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleDeleteMaterial = async (matnr: string) => {
    try {
      const res = await fetch(`/api/materials/${matnr}`, {
        method: 'DELETE',
        headers: buildHeaders(false),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error };
      setData(json.db);
      setActiveRoute('mm60');
      showToast(`Material ${matnr} telah dihapus dari MARA.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleCreatePr = async (payload: {
    matnr: string;
    werks: string;
    lgort: string;
    bwtar?: ValuationTypeCode;
    menge: number;
    lfdat: string;
  }) => {
    const res = await fetch('/api/mm/prs', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleConvertPrToPo = async (
    banfn: string,
    payload: { lifnr: string; netpr: number; eindt: string; bwtar?: ValuationTypeCode }
  ) => {
    const res = await fetch(`/api/mm/prs/${banfn}/convert`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleCreatePo = async (payload: {
    lifnr: string;
    matnr: string;
    werks: string;
    lgort: string;
    bwtar?: ValuationTypeCode;
    menge: number;
    netpr: number;
    eindt: string;
  }) => {
    const res = await fetch('/api/mm/pos', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handlePostMigo = async (payload: {
    bwart: MovementTypeCode;
    matnr: string;
    werks: string;
    lgort: string;
    targetLgort?: string;
    bwtar?: ValuationTypeCode;
    ebeln?: string;
    kostl?: string;
    menge: number;
    bktxt?: string;
  }) => {
    const res = await fetch('/api/mm/migo', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true, docNumber: json.doc?.mblnr };
  };

  const handleSaveStandardRules = async (rules: StandardFieldRule[]) => {
    const res = await fetch('/api/customizing/standard-rules', {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify({ rules }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleCreateCustomField = async (field: CustomIndustryField) => {
    const res = await fetch('/api/customizing/industry-fields', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ field }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleUpdateCustomField = async (field: CustomIndustryField) => {
    const res = await fetch(`/api/customizing/industry-fields/${field.id}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify({ field }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleDeleteCustomField = async (id: string) => {
    const res = await fetch(`/api/customizing/industry-fields/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(false),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleCreateMaterialGroup = async (group: {
    matkl: string;
    label: string;
    classificationClass?: string;
    defaultMtart?: MaterialTypeCode;
    defaultBklas?: string;
    description?: string;
  }) => {
    const res = await fetch('/api/customizing/material-groups', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ group }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleUpdateMaterialGroup = async (
    matkl: string,
    group: {
      label: string;
      classificationClass?: string;
      defaultMtart?: MaterialTypeCode;
      defaultBklas?: string;
      description?: string;
    }
  ) => {
    const res = await fetch(`/api/customizing/material-groups/${encodeURIComponent(matkl)}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify({ group }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleDeleteMaterialGroup = async (matkl: string) => {
    const res = await fetch(`/api/customizing/material-groups/${encodeURIComponent(matkl)}`, {
      method: 'DELETE',
      headers: buildHeaders(false),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleCreateUom = async (uom: {
    msehi: string;
    label: string;
    isoCode?: string;
    dimension?: UomDimension;
    decimalPlaces?: number;
    description?: string;
  }) => {
    const res = await fetch('/api/customizing/uoms', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ uom }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleUpdateUom = async (msehi: string, uom: Partial<UnitOfMeasureDefinition>) => {
    const res = await fetch(`/api/customizing/uoms/${encodeURIComponent(msehi)}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify({ uom }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleDeleteUom = async (msehi: string) => {
    const res = await fetch(`/api/customizing/uoms/${encodeURIComponent(msehi)}`, {
      method: 'DELETE',
      headers: buildHeaders(false),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleCreateCharacteristic = async (
    matkl: string,
    characteristic: MasterCharacteristic
  ) => {
    const res = await fetch(`/api/customizing/material-groups/${encodeURIComponent(matkl)}/characteristics`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ characteristic }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleUpdateCharacteristic = async (
    matkl: string,
    characteristic: MasterCharacteristic
  ) => {
    const res = await fetch(
      `/api/customizing/material-groups/${encodeURIComponent(matkl)}/characteristics/${encodeURIComponent(characteristic.id)}`,
      {
        method: 'PUT',
        headers: buildHeaders(true),
        body: JSON.stringify({ characteristic }),
      }
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleDeleteCharacteristic = async (matkl: string, charId: string) => {
    const res = await fetch(
      `/api/customizing/material-groups/${encodeURIComponent(matkl)}/characteristics/${encodeURIComponent(charId)}`,
      {
        method: 'DELETE',
        headers: buildHeaders(false),
      }
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleReorderCharacteristics = async (matkl: string, charIds: string[]) => {
    const res = await fetch(
      `/api/customizing/material-groups/${encodeURIComponent(matkl)}/reorder`,
      {
        method: 'PUT',
        headers: buildHeaders(true),
        body: JSON.stringify({ charIds }),
      }
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleSaveSearchDictionaryEntry = async (
    entry: Pick<MaterialSearchDictionaryEntry, 'keyword' | 'aliases'>,
    id?: string
  ) => {
    try {
      const res = await fetch(
        id ? `/api/search-dictionary/${encodeURIComponent(id)}` : '/api/search-dictionary',
        {
          method: id ? 'PUT' : 'POST',
          headers: buildHeaders(true),
          body: JSON.stringify(entry),
        }
      );
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error as string | undefined };
      setData(json.db as SapBootstrapPayload);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server untuk menyimpan kamus pencarian.' };
    }
  };

  const handleDeleteSearchDictionaryEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/search-dictionary/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildHeaders(false),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error as string | undefined };
      setData(json.db as SapBootstrapPayload);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server untuk menghapus kamus pencarian.' };
    }
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: buildHeaders(false),
    });
    if (res.ok) {
      const fresh = (await res.json()) as SapBootstrapPayload;
      applyBootstrapPayload(fresh, true);
      setActiveRoute('mm60');
      showToast('Seluruh data multi-tenant (PT. VDI, PT. PA, PT. MT, PT. HRI, PT. HAMAC) dikembalikan ke standar.');
    }
  };

  const breadcrumb = ROUTE_BREADCRUMBS[activeRoute];

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-slate-900">
      <Sidebar
        activeRoute={activeRoute}
        activeTenant={data?.activeTenant}
        tenants={data?.tenants || []}
        onSwitchTenant={handleSwitchTenant}
        onNavigate={handleNavigate}
        onTcodeJump={handleTcodeJump}
        onResetDemo={handleResetDemo}
        counts={{
          materials: data?.materials.length || 0,
          openPrs: data?.purchaseRequisitions.filter((p) => p.status !== 'Converted to PO').length || 0,
          openPos: data?.purchaseOrders.filter((p) => p.status !== 'Completed').length || 0,
          customFields: data?.customIndustryFields.length || 0,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Top Bar Contract */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            {data?.activeTenant && (
              <>
                <span className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                  {data.activeTenant.bukrs}
                </span>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span className="whitespace-nowrap">{breadcrumb.section}</span>
            <span aria-hidden="true">/</span>
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {breadcrumb.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('mm01')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Material (MM01)</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {toastMsg && (
            <div className="mb-4 px-4 py-2.5 bg-slate-900 text-white text-xs rounded-md flex items-center justify-between">
              <span>{toastMsg}</span>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                className="text-slate-300 hover:text-white ml-4"
              >
                Tutup
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
                ))}
              </div>
              <div className="h-96 bg-white border border-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : loadError || !data ? (
            <div className="bg-white border border-red-200 rounded-lg p-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {loadError || 'Data SAP tidak tersedia'}
              </div>
              <button
                type="button"
                onClick={() => fetchBootstrap()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0064D9] rounded-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
            </div>
          ) : (
            <>
              {activeRoute === 'mm60' && (
                <MaterialListView
                  data={data}
                  onOpenMaterial={(matnr, mode) => {
                    setSelectedMatnr(matnr);
                    setEditorMode(mode);
                    setActiveRoute('mm02');
                  }}
                  onCreatePrForMaterial={(matnr, werks) => {
                    setMmPreselectMatnr(matnr);
                    setMmPreselectWerks(werks);
                    setActiveRoute('me51n');
                  }}
                  onOpenStockOverview={(matnr) => {
                    setMmPreselectMatnr(matnr);
                    setActiveRoute('mmbe');
                  }}
                  onCreateNewMaterial={() => handleNavigate('mm01')}
                  onImported={(payload) => applyBootstrapPayload(payload, false)}
                  onSaveSearchDictionaryEntry={handleSaveSearchDictionaryEntry}
                  onDeleteSearchDictionaryEntry={handleDeleteSearchDictionaryEntry}
                />
              )}

              {(activeRoute === 'mm01' || activeRoute === 'mm02') && (
                <MaterialMasterEditor
                  data={data}
                  mode={activeRoute === 'mm01' ? 'create' : editorMode}
                  initialMatnr={selectedMatnr}
                  onModeChange={(nextM) => {
                    if (nextM === 'create') {
                      setActiveRoute('mm01');
                    } else {
                      setActiveRoute('mm02');
                      setEditorMode(nextM);
                    }
                  }}
                  onSelectMaterial={(matnr) => setSelectedMatnr(matnr)}
                  onSaveMaterial={handleSaveMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                  onBackToList={() => setActiveRoute('mm60')}
                  onOpenCustomizing={(ind) => {
                    setCustomizingIndustry(ind);
                    setActiveRoute('oms9');
                  }}
                  onMmAction={(action, matnr, werks) => {
                    setMmPreselectMatnr(matnr);
                    setMmPreselectWerks(werks);
                    setActiveRoute(action);
                  }}
                />
              )}

              {(activeRoute === 'me51n' ||
                activeRoute === 'me21n' ||
                activeRoute === 'migo' ||
                activeRoute === 'mmbe') && (
                <MmIntegrationView
                  data={data}
                  activeTab={activeRoute}
                  preselectedMatnr={mmPreselectMatnr}
                  preselectedWerks={mmPreselectWerks}
                  onTabChange={(tab) => setActiveRoute(tab)}
                  onOpenMaterial={(matnr) => {
                    setSelectedMatnr(matnr);
                    setEditorMode('edit');
                    setActiveRoute('mm02');
                  }}
                  onCreatePr={handleCreatePr}
                  onConvertPrToPo={handleConvertPrToPo}
                  onCreatePo={handleCreatePo}
                  onPostMigo={handlePostMigo}
                />
              )}

              {activeRoute === 'ox02' && (
                <TenantManagementView
                  data={data}
                  onSwitchTenant={handleSwitchTenant}
                  onCreateTenant={handleCreateTenant}
                  onDeleteTenant={handleDeleteTenant}
                  onSavePlant={handleSavePlant}
                  onDeletePlant={handleDeletePlant}
                />
              )}

              {activeRoute === 'oms9' && (
                <IndustryCustomizingView
                  data={data}
                  initialIndustry={customizingIndustry}
                  initialSubTab={customizingSubTab}
                  onSaveStandardRules={handleSaveStandardRules}
                  onCreateCustomField={handleCreateCustomField}
                  onUpdateCustomField={handleUpdateCustomField}
                  onDeleteCustomField={handleDeleteCustomField}
                  onCreateMaterialGroup={handleCreateMaterialGroup}
                  onUpdateMaterialGroup={handleUpdateMaterialGroup}
                  onDeleteMaterialGroup={handleDeleteMaterialGroup}
                  onCreateCharacteristic={handleCreateCharacteristic}
                  onUpdateCharacteristic={handleUpdateCharacteristic}
                  onDeleteCharacteristic={handleDeleteCharacteristic}
                  onReorderCharacteristics={handleReorderCharacteristics}
                  onCreateUom={handleCreateUom}
                  onUpdateUom={handleUpdateUom}
                  onDeleteUom={handleDeleteUom}
                />
              )}

              {activeRoute === 'coa' && <CoaReferenceView />}

              {activeRoute === 'cdhdr' && (
                <AuditTrailView
                  changeDocuments={data.changeDocuments}
                  onOpenMaterial={(matnr) => {
                    setSelectedMatnr(matnr);
                    setEditorMode('edit');
                    setActiveRoute('mm02');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
