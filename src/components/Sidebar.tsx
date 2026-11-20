import React, { useState } from 'react';
import {
  Boxes,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  History,
  Layers,
  PackagePlus,
  Search,
  ShoppingCart,
  Sliders,
  Warehouse,
} from 'lucide-react';
import type { TenantCompany, TenantSummary } from '../types/sap.ts';

export type ActiveRoute =
  | 'mm60'
  | 'mm02'
  | 'mm01'
  | 'me51n'
  | 'me21n'
  | 'migo'
  | 'mmbe'
  | 'oms9'
  | 'ox02'
  | 'cdhdr';

interface SidebarProps {
  activeRoute: ActiveRoute;
  activeTenant?: TenantCompany;
  tenants: TenantSummary[];
  onSwitchTenant: (tenantId: string) => void;
  onNavigate: (route: ActiveRoute) => void;
  onTcodeJump: (tcode: string) => void;
  counts: {
    materials: number;
    openPrs: number;
    openPos: number;
    customFields: number;
  };
}

interface NavGroup {
  title: string;
  items: {
    id: ActiveRoute;
    tcode: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[];
}

export function Sidebar({
  activeRoute,
  activeTenant,
  tenants,
  onSwitchTenant,
  onNavigate,
  onTcodeJump,
  counts,
}: SidebarProps) {
  const [tcodeInput, setTcodeInput] = useState('');

  const groups: NavGroup[] = [
    {
      title: 'Material Master',
      items: [
        { id: 'mm60', tcode: 'MM60', label: 'Daftar Material', icon: Boxes, count: counts.materials },
        { id: 'mm02', tcode: 'MM02', label: 'Kelola Material', icon: Layers },
        { id: 'mm01', tcode: 'MM01', label: 'Buat Material', icon: PackagePlus },
      ],
    },
    {
      title: 'Materials Management (MM)',
      items: [
        { id: 'me51n', tcode: 'ME51N', label: 'Purchase Requisition', icon: ClipboardList, count: counts.openPrs },
        { id: 'me21n', tcode: 'ME21N', label: 'Purchase Order', icon: ShoppingCart, count: counts.openPos },
        { id: 'migo', tcode: 'MIGO', label: 'Goods Movement', icon: FileSpreadsheet },
        { id: 'mmbe', tcode: 'MMBE', label: 'Stock Overview', icon: Warehouse },
      ],
    },
    {
      title: 'SPRO & Tata Kelola',
      items: [
        { id: 'ox02', tcode: 'OX02', label: 'Perusahaan (Tenant)', icon: Building2, count: tenants.length },
        { id: 'oms9', tcode: 'OMS9', label: 'Kustomisasi Industri', icon: Sliders, count: counts.customFields },
        { id: 'cdhdr', tcode: 'CDHDR', label: 'Change Documents', icon: History },
      ],
    },
  ];

  const handleTcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcodeInput.trim()) return;
    onTcodeJump(tcodeInput.trim());
    setTcodeInput('');
  };

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-screen select-none">
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
          SAP S/4HANA Enterprise
        </div>

        {/* Multi-Tenant Selector */}
        {activeTenant && tenants.length > 0 && (
          <div className="mt-2.5">
            <label htmlFor="tenant-switcher" className="sr-only">
              Pilih Perusahaan Tenant
            </label>
            <select
              id="tenant-switcher"
              value={activeTenant.tenantId}
              onChange={(e) => onSwitchTenant(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-[#0064D9] focus:bg-white transition-colors"
            >
              {tenants.map((t) => (
                <option key={t.tenantId} value={t.tenantId}>
                  {t.bukrs} · {t.shortName}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Client {activeTenant.clientNumber} · {activeTenant.coreBusiness}
            </div>
          </div>
        )}

        <form onSubmit={handleTcodeSubmit} className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={tcodeInput}
            onChange={(e) => setTcodeInput(e.target.value)}
            placeholder="T-Code (mis. MM01, OX02)"
            aria-label="Jump to SAP Transaction Code"
            className="w-full pl-8 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0064D9] focus:bg-white transition-colors"
          />
        </form>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-wide text-slate-400">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#EAF2FD] text-[#0064D9]'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#0064D9]' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] tabular-nums">
                      {item.count !== undefined && item.count > 0 && (
                        <span className={isActive ? 'text-[#0064D9]' : 'text-slate-400'}>
                          {item.count}
                        </span>
                      )}
                      <span
                        className={
                          isActive
                            ? 'text-[#0064D9] font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {item.tcode}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  );
}
