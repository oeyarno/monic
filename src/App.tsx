import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { IndustryCustomizingView } from './components/IndustryCustomizingView.tsx';
import { MaterialListView } from './components/MaterialListView.tsx';
import { MaterialMasterEditor } from './components/MaterialMasterEditor.tsx';
import { MmIntegrationView } from './components/MmIntegrationView.tsx';
import { type ActiveRoute, Sidebar } from './components/Sidebar.tsx';
import type {
  CustomIndustryField,
  IndustrySectorCode,
  MaterialMasterRecord,
  MovementTypeCode,
  SapBootstrapPayload,
  StandardFieldRule,
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
  oms9: { section: 'SPRO Customizing', title: 'OMS9 · Kustomisasi Field Spesifik Industri' },
  cdhdr: { section: 'Tata Kelola', title: 'CDHDR · Change Documents & Audit Trail' },
};

export default function App() {
  const [data, setData] = useState<SapBootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('mm60');
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'view'>('edit');
  const [selectedMatnr, setSelectedMatnr] = useState<string | undefined>(undefined);
  const [mmPreselectMatnr, setMmPreselectMatnr] = useState<string | undefined>(undefined);
  const [mmPreselectWerks, setMmPreselectWerks] = useState<string | undefined>(undefined);
  const [customizingIndustry, setCustomizingIndustry] = useState<IndustrySectorCode | undefined>('C');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Gagal memuat data SAP S/4HANA dari server.');
      const payload = (await res.json()) as SapBootstrapPayload;
      setData(payload);
      if (!selectedMatnr && payload.materials[0]) {
        setSelectedMatnr(payload.materials[0].mara.matnr);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, [selectedMatnr]);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 4000);
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
      oms9: 'oms9',
      oms3: 'oms9',
      spro: 'oms9',
      cdhdr: 'cdhdr',
      cdpos: 'cdhdr',
    };
    const target = map[code];
    if (!target) {
      showToast(`T-Code "${raw.toUpperCase()}" tidak dikenali. Gunakan MM60, MM01, MM02, ME51N, ME21N, MIGO, MMBE, OMS9, atau CDHDR.`);
      return;
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
    activeWerks: string
  ) => {
    try {
      const url = isCreate ? '/api/materials' : `/api/materials/${material.mara.matnr}`;
      const method = isCreate ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material, activeWerks }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error, details: json.details };
      }
      setData(json.db);
      setSelectedMatnr(material.mara.matnr);
      if (isCreate) {
        setEditorMode('edit');
        setActiveRoute('mm02');
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  };

  const handleDeleteMaterial = async (matnr: string) => {
    try {
      const res = await fetch(`/api/materials/${matnr}`, { method: 'DELETE' });
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    setData(json.db);
    return { ok: true };
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (res.ok) {
      const fresh = (await res.json()) as SapBootstrapPayload;
      setData(fresh);
      setSelectedMatnr(fresh.materials[0]?.mara.matnr);
      setActiveRoute('mm60');
      showToast('Data Material Master, MM, dan OMS9 dikembalikan ke dataset standar.');
    }
  };

  const breadcrumb = ROUTE_BREADCRUMBS[activeRoute];

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-slate-900">
      <Sidebar
        activeRoute={activeRoute}
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
                onClick={fetchBootstrap}
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

              {activeRoute === 'oms9' && (
                <IndustryCustomizingView
                  data={data}
                  initialIndustry={customizingIndustry}
                  onSaveStandardRules={handleSaveStandardRules}
                  onCreateCustomField={handleCreateCustomField}
                  onUpdateCustomField={handleUpdateCustomField}
                  onDeleteCustomField={handleDeleteCustomField}
                />
              )}

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
