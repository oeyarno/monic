import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  SapBootstrapPayload,
  TenantCoreBusinessType,
} from '../types/sap.ts';
import { formatCurrency, formatNumber } from '../utils/format.ts';

interface TenantManagementViewProps {
  data: SapBootstrapPayload;
  onSwitchTenant: (tenantId: string) => Promise<void>;
  onCreateTenant: (payload: {
    bukrs: string;
    name: string;
    coreBusinessType: TenantCoreBusinessType;
    city: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteTenant: (tenantId: string) => Promise<{ ok: boolean; error?: string }>;
}

const CORE_BUSINESS_TEMPLATES: {
  value: TenantCoreBusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: 'oil_gas_contractor',
    label: 'Kontraktor Alat Berat & Maintenance Oil & Gas',
    description: 'Plant supply base & fabrication yard, field API/ASME, NACE MR0175, MTC EN 10204 3.1, CAS.',
  },
  {
    value: 'tools_ppe',
    label: 'Penjualan Tools, Peralatan & Kalibrasi',
    description: 'Penjualan tools, peralatan & APD (ke grup maupun pihak luar) serta layanan kalibrasi alat.',
  },
  {
    value: 'calibration_service',
    label: 'Jasa Kalibrasi Alat & Instrumen',
    description: 'Laboratorium jasa kalibrasi alat ukur, gas detector, torque wrench & sertifikasi ISO/IEC 17025.',
  },
  {
    value: 'heavy_workshop',
    label: 'Workshop & Maintenance Alat Berat',
    description: 'Central rebuild & site workshop, model alat berat, OEM cross-ref, Core Exchange (OLD), HM.',
  },
  {
    value: 'unit_spareparts',
    label: 'Penjualan Alat Berat, Kendaraan & Spare Parts',
    description: 'Showroom PDI yard & parts DC, lini unit/parts, seri rangka, moving velocity, garansi & PDI.',
  },
  {
    value: 'general_industry',
    label: 'Manufaktur & Industri Umum',
    description: 'Struktur plant & gudang standar untuk bisnis manufaktur atau distribusi umum.',
  },
];

export function TenantManagementView({
  data,
  onSwitchTenant,
  onCreateTenant,
  onDeleteTenant,
}: TenantManagementViewProps) {
  const [bukrs, setBukrs] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [coreBusinessType, setCoreBusinessType] =
    useState<TenantCoreBusinessType>('oil_gas_contractor');
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    const res = await onCreateTenant({
      bukrs,
      name,
      coreBusinessType,
      city,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Tenant ${bukrs.toUpperCase()} (${name}) berhasil diprovisioning dengan isolasi Material Master, MM, dan CI_MARA.`,
      });
      setBukrs('');
      setName('');
      setCity('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menambah perusahaan tenant.' });
    }
  };

  const handleActivate = async (tenantId: string) => {
    setFeedback(null);
    setSwitchingId(tenantId);
    await onSwitchTenant(tenantId);
    setSwitchingId(null);
  };

  const handleDelete = async (tenantId: string) => {
    setFeedback(null);
    const res = await onDeleteTenant(tenantId);
    setConfirmDeleteId(null);
    if (res.ok) {
      setFeedback({ type: 'ok', text: 'Tenant berhasil dihapus dari daftar perusahaan.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menghapus tenant.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Overview */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              OX02 · Arsitektur Multi-Tenant &amp; Company Code (BUKRS)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap perusahaan (tenant) memiliki ruang data terisolasi: Material Master (MARA/MARC/MARD/MBEW), PR/PO/MIGO, struktur field CI_MARA, dan aturan OMS9 sesuai core business masing-masing.
            </p>
          </div>
          <div className="text-xs text-slate-600 font-mono tabular-nums shrink-0">
            Tenant Aktif: <span className="font-semibold text-[#0064D9]">{data.activeTenant.bukrs}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>Client {data.activeTenant.clientNumber}</span>
          </div>
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

      {/* Tenant Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Daftar Perusahaan Tenant Terdaftar ({data.tenants.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-5 whitespace-nowrap">BUKRS / Client</th>
                <th className="py-2.5 px-5">Perusahaan &amp; Core Business</th>
                <th className="py-2.5 px-5 text-right whitespace-nowrap">Material (MARA)</th>
                <th className="py-2.5 px-5 text-right whitespace-nowrap">Plant</th>
                <th className="py-2.5 px-5 text-right whitespace-nowrap">PR / PO Open</th>
                <th className="py-2.5 px-5 text-right whitespace-nowrap">Nilai Stok (SALK3)</th>
                <th className="py-2.5 px-5 text-right whitespace-nowrap">Aksi Tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.tenants.map((tenant) => {
                const isActive = tenant.tenantId === data.activeTenant.tenantId;
                return (
                  <tr
                    key={tenant.tenantId}
                    className={isActive ? 'bg-[#EAF2FD]/45' : 'hover:bg-slate-50'}
                  >
                    <td className="py-3.5 px-5 align-top whitespace-nowrap font-mono">
                      <div className="font-bold text-slate-900">{tenant.bukrs}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Client {tenant.clientNumber} · {tenant.city}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 align-top max-w-md">
                      <div className="font-semibold text-slate-900">{tenant.name}</div>
                      <div className="text-[11px] text-[#0064D9] font-medium mt-0.5">
                        {tenant.coreBusiness} · HAWA / Sektor {tenant.defaultIndustry}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {tenant.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 align-top text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumber(tenant.materialCount)}
                    </td>

                    <td className="py-3.5 px-5 align-top text-right font-mono tabular-nums text-slate-700">
                      {formatNumber(tenant.plantCount)}
                    </td>

                    <td className="py-3.5 px-5 align-top text-right font-mono tabular-nums text-slate-700">
                      {tenant.openPrCount} PR / {tenant.openPoCount} PO
                    </td>

                    <td className="py-3.5 px-5 align-top text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(tenant.totalInventoryValue)}
                    </td>

                    <td className="py-3.5 px-5 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 px-2.5 py-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Tenant Aktif</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={switchingId === tenant.tenantId}
                            onClick={() => handleActivate(tenant.tenantId)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors whitespace-nowrap"
                          >
                            {switchingId === tenant.tenantId ? 'Memuat...' : 'Aktifkan Tenant'}
                          </button>
                        )}

                        {data.tenants.length > 1 && (
                          confirmDeleteId === tenant.tenantId ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(tenant.tenantId)}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tenant.tenantId)}
                              title="Hapus tenant"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Tenant Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0064D9]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Tambah Perusahaan / Tenant Baru (OX02 Provisioning)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Pilih template Core Business agar sistem langsung menyiapkan Plant, Storage Location, Vendor, aturan OMS9, dan field append CI_MARA yang sesuai.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Company Code (BUKRS)
            </label>
            <input
              type="text"
              required
              maxLength={4}
              value={bukrs}
              onChange={(e) => setBukrs(e.target.value.toUpperCase())}
              placeholder="mis. 006"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. PT Karya Migas Nusantara"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Kota Operasional
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="mis. Balikpapan"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Template Core Business
            </label>
            <select
              value={coreBusinessType}
              onChange={(e) => setCoreBusinessType(e.target.value as TenantCoreBusinessType)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
            >
              {CORE_BUSINESS_TEMPLATES.map((tpl) => (
                <option key={tpl.value} value={tpl.value}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {CORE_BUSINESS_TEMPLATES.find((t) => t.value === coreBusinessType)?.description}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{submitting ? 'Membuat Tenant...' : 'Buat & Aktifkan Tenant'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
