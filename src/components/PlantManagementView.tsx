import React, { useState } from 'react';
import { MapPin, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { PlantDefinition, SapBootstrapPayload } from '../types/sap.ts';

interface PlantManagementViewProps {
  data: SapBootstrapPayload;
  onSave: (plant: PlantDefinition, originalWerks?: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (werks: string) => Promise<{ ok: boolean; error?: string }>;
}

const emptyPlant = (bukrs: string): PlantDefinition => ({
  werks: '',
  name: '',
  city: '',
  bukrs,
  storageLocations: [{ lgort: '0001', lgobe: 'Gudang Utama', type: 'Main Warehouse' }],
});

export function PlantManagementView({ data, onSave, onDelete }: PlantManagementViewProps) {
  const [draft, setDraft] = useState<PlantDefinition>(() => emptyPlant(data.activeTenant.bukrs));
  const [editingWerks, setEditingWerks] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const startCreate = () => {
    setEditingWerks(undefined);
    setDraft(emptyPlant(data.activeTenant.bukrs));
    setFeedback(null);
  };

  const startEdit = (plant: PlantDefinition) => {
    setEditingWerks(plant.werks);
    setDraft(structuredClone(plant));
    setFeedback(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const result = await onSave(
      { ...draft, bukrs: data.activeTenant.bukrs },
      editingWerks
    );
    setSaving(false);
    if (result.ok) {
      const action = editingWerks ? 'diperbarui' : 'dibuat';
      setEditingWerks(undefined);
      setDraft(emptyPlant(data.activeTenant.bukrs));
      setFeedback({ ok: true, text: `Plant ${draft.werks} berhasil ${action}.` });
    } else {
      setFeedback({ ok: false, text: result.error || 'Gagal menyimpan Plant.' });
    }
  };

  const handleDelete = async (werks: string) => {
    const result = await onDelete(werks);
    setPendingDelete(undefined);
    setFeedback({
      ok: result.ok,
      text: result.ok ? `Plant ${werks} berhasil dihapus.` : result.error || 'Gagal menghapus Plant.',
    });
    if (editingWerks === werks && result.ok) startCreate();
  };

  const updateStorageLocation = (
    index: number,
    field: 'lgort' | 'lgobe' | 'type',
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      storageLocations: current.storageLocations.map((location, currentIndex) =>
        currentIndex === index
          ? { ...location, [field]: field === 'lgort' ? value.toUpperCase() : value }
          : location
      ),
    }));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">OX10 · Plant / WERKS</h3>
          <p className="text-xs text-slate-500 mt-1">
            Master Plant milik {data.activeTenant.bukrs} · {data.plants.length} Plant
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Plant
        </button>
      </div>

      {feedback && (
        <div className={`mx-5 mt-4 px-3 py-2 rounded-md text-xs border ${feedback.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {feedback.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
              <th className="px-5 py-2.5">Plant (WERKS)</th>
              <th className="px-5 py-2.5">Nama / Kota</th>
              <th className="px-5 py-2.5">Storage Location</th>
              <th className="px-5 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.plants.map((plant) => (
              <tr key={plant.werks} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono font-semibold text-slate-900">{plant.werks}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{plant.name}</div>
                  <div className="text-slate-500 mt-0.5">{plant.city}</div>
                </td>
                <td className="px-5 py-3">
                  {plant.storageLocations.map((location) => (
                    <div key={location.lgort} className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{location.lgort}</span> · {location.lgobe}
                    </div>
                  ))}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(plant)}
                    className="p-1.5 text-slate-500 hover:text-[#0064D9] hover:bg-blue-50 rounded"
                    aria-label={`Edit Plant ${plant.werks}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {pendingDelete === plant.werks ? (
                    <span className="inline-flex items-center gap-1 ml-1">
                      <button type="button" onClick={() => handleDelete(plant.werks)} className="px-2 py-1 text-[10px] font-semibold text-white bg-red-600 rounded">Ya</button>
                      <button type="button" onClick={() => setPendingDelete(undefined)} className="px-2 py-1 text-[10px] text-slate-600 bg-slate-100 rounded">Batal</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(plant.werks)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      aria-label={`Hapus Plant ${plant.werks}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.plants.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Belum ada Plant untuk Company Code ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSave} className="p-5 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-800">{editingWerks ? `Edit Plant ${editingWerks}` : 'Plant Baru'}</h4>
          {editingWerks && (
            <button type="button" onClick={startCreate} className="text-xs text-slate-500 hover:text-slate-800">
              <X className="w-3.5 h-3.5 inline mr-1" />Batal edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-[11px] font-medium text-slate-600">
            WERKS
            <input
              required
              maxLength={4}
              disabled={Boolean(editingWerks)}
              value={draft.werks}
              onChange={(event) => setDraft((current) => ({ ...current, werks: event.target.value.toUpperCase() }))}
              placeholder="Contoh: PL01"
              className="mt-1 w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md disabled:bg-slate-100"
            />
          </label>
          <label className="text-[11px] font-medium text-slate-600">
            Nama Plant
            <input required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md" />
          </label>
          <label className="text-[11px] font-medium text-slate-600">
            Kota
            <input required value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md" />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">Storage Location (LGORT)</span>
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, storageLocations: [...current.storageLocations, { lgort: '', lgobe: '', type: 'Main Warehouse' }] }))}
              className="text-[11px] font-medium text-[#0064D9] hover:underline"
            >
              + Tambah Storage Location
            </button>
          </div>
          {draft.storageLocations.map((location, index) => (
            <div key={`${editingWerks || 'new'}-${index}`} className="grid grid-cols-12 gap-2">
              <input required maxLength={4} value={location.lgort} onChange={(event) => updateStorageLocation(index, 'lgort', event.target.value)} placeholder="LGORT" className="col-span-3 px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md" />
              <input required value={location.lgobe} onChange={(event) => updateStorageLocation(index, 'lgobe', event.target.value)} placeholder="Nama Storage Location" className="col-span-6 px-2.5 py-2 text-xs border border-slate-200 rounded-md" />
              <input value={location.type} onChange={(event) => updateStorageLocation(index, 'type', event.target.value)} placeholder="Tipe" className="col-span-2 px-2.5 py-2 text-xs border border-slate-200 rounded-md" />
              <button
                type="button"
                disabled={draft.storageLocations.length <= 1}
                onClick={() => setDraft((current) => ({ ...current, storageLocations: current.storageLocations.filter((_, currentIndex) => currentIndex !== index) }))}
                className="col-span-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Hapus Storage Location dari form"
              >
                <Trash2 className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0064D9] rounded-md disabled:opacity-60">
            <Save className="w-3.5 h-3.5" />{saving ? 'Menyimpan...' : editingWerks ? 'Simpan Perubahan Plant' : 'Simpan Plant'}
          </button>
        </div>
      </form>
    </section>
  );
}
