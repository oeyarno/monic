import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Pencil,
  Plus,
  Ruler,
  Save,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import {
  VALUATION_CLASSES,
  type CharacteristicDataType,
  type CustomFieldDataType,
  type CustomIndustryField,
  type FieldStatus,
  type IndustrySectorCode,
  type MasterCharacteristic,
  type MaterialTypeCode,
  type SapBootstrapPayload,
  type StandardFieldRule,
  type UnitOfMeasureDefinition,
  type UomDimension,
} from '../types/sap.ts';
import { formatCharacteristicPattern } from '../utils/format.ts';

interface IndustryCustomizingViewProps {
  data: SapBootstrapPayload;
  initialIndustry?: IndustrySectorCode;
  initialSubTab?: 'oms9' | 'append' | 'ct04' | 'cuni';
  onSaveStandardRules: (rules: StandardFieldRule[]) => Promise<{ ok: boolean; error?: string }>;
  onCreateCustomField: (field: CustomIndustryField) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCustomField: (field: CustomIndustryField) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCustomField: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateMaterialGroup: (group: {
    matkl: string;
    label: string;
    classificationClass?: string;
    defaultMtart?: MaterialTypeCode;
    defaultBklas?: string;
    description?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateMaterialGroup: (
    matkl: string,
    group: {
      label: string;
      classificationClass?: string;
      defaultMtart?: MaterialTypeCode;
      defaultBklas?: string;
      description?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteMaterialGroup: (matkl: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateCharacteristic: (
    matkl: string,
    characteristic: MasterCharacteristic
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCharacteristic: (
    matkl: string,
    characteristic: MasterCharacteristic
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCharacteristic: (matkl: string, charId: string) => Promise<{ ok: boolean; error?: string }>;
  onReorderCharacteristics: (matkl: string, charIds: string[]) => Promise<{ ok: boolean; error?: string }>;
  onCreateUom: (uom: {
    msehi: string;
    label: string;
    isoCode?: string;
    dimension?: UomDimension;
    decimalPlaces?: number;
    description?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateUom: (msehi: string, uom: Partial<UnitOfMeasureDefinition>) => Promise<{ ok: boolean; error?: string }>;
  onDeleteUom: (msehi: string) => Promise<{ ok: boolean; error?: string }>;
}

const STATUS_OPTIONS: { value: FieldStatus; label: string }[] = [
  { value: 'required', label: 'Required (Wajib)' },
  { value: 'optional', label: 'Optional' },
  { value: 'display', label: 'Display (Read-Only)' },
  { value: 'hide', label: 'Hide (Sembunyikan)' },
];

const UOM_DIMENSIONS: UomDimension[] = ['Count', 'Weight', 'Volume', 'Length', 'Packaging', 'Time'];

export function IndustryCustomizingView({
  data,
  initialIndustry,
  initialSubTab,
  onSaveStandardRules,
  onCreateCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onCreateMaterialGroup,
  onUpdateMaterialGroup,
  onDeleteMaterialGroup,
  onCreateCharacteristic,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  onReorderCharacteristics,
  onCreateUom,
  onUpdateUom,
  onDeleteUom,
}: IndustryCustomizingViewProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<IndustrySectorCode>(
    initialIndustry || data.activeTenant?.defaultIndustry || data.industrySectors[0]?.mbrsh || 'M'
  );
  const [activeSubTab, setActiveSubTab] = useState<'oms9' | 'append' | 'ct04' | 'cuni'>(
    initialSubTab || 'oms9'
  );
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

  // CT04 Master Characteristic & Material Group state
  const [selectedMatkl, setSelectedMatkl] = useState<string>(
    data.materialGroups?.[0]?.matkl || ''
  );
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [newGroupClass, setNewGroupClass] = useState('');
  const [newGroupMtart, setNewGroupMtart] = useState<MaterialTypeCode>('HAWA');
  const [newGroupBklas, setNewGroupBklas] = useState<string>('3100');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Edit active Material Group state
  const [editingGroupMatkl, setEditingGroupMatkl] = useState<string | null>(null);
  const [editGroupLabel, setEditGroupLabel] = useState('');
  const [editGroupClass, setEditGroupClass] = useState('');
  const [editGroupMtart, setEditGroupMtart] = useState<MaterialTypeCode>('HAWA');
  const [editGroupBklas, setEditGroupBklas] = useState<string>('3100');
  const [editGroupDesc, setEditGroupDesc] = useState('');

  // CUNI Master Unit of Measure state
  const [newUomCode, setNewUomCode] = useState('');
  const [newUomLabel, setNewUomLabel] = useState('');
  const [newUomIso, setNewUomIso] = useState('');
  const [newUomDimension, setNewUomDimension] = useState<UomDimension>('Count');
  const [newUomDecimals, setNewUomDecimals] = useState<number>(0);
  const [newUomDesc, setNewUomDesc] = useState('');

  const [editingUomMsehi, setEditingUomMsehi] = useState<string | null>(null);
  const [editUomLabel, setEditUomLabel] = useState('');
  const [editUomIso, setEditUomIso] = useState('');
  const [editUomDimension, setEditUomDimension] = useState<UomDimension>('Count');
  const [editUomDesc, setEditUomDesc] = useState('');

  const [newCharName, setNewCharName] = useState('');
  const [newCharLabel, setNewCharLabel] = useState('');
  const [newCharType, setNewCharType] = useState<CharacteristicDataType>('text');
  const [newCharUnit, setNewCharUnit] = useState('');
  const [newCharOptionsRaw, setNewCharOptionsRaw] = useState('');
  const [newCharRequired, setNewCharRequired] = useState(true);
  const [newCharHelp, setNewCharHelp] = useState('');

  useEffect(() => {
    setRulesDraft(structuredClone(data.standardFieldRules));
  }, [data.standardFieldRules]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    setSelectedIndustry(
      initialIndustry || data.activeTenant?.defaultIndustry || data.industrySectors[0]?.mbrsh || 'M'
    );
    setSelectedMatkl(data.materialGroups?.[0]?.matkl || '');
    setEditingGroupMatkl(null);
    setEditingUomMsehi(null);
    setFeedback(null);
  }, [initialIndustry, data.activeTenant.tenantId]);

  useEffect(() => {
    if (
      data.materialGroups.length > 0 &&
      !data.materialGroups.some((mg) => mg.matkl === selectedMatkl)
    ) {
      setSelectedMatkl(data.materialGroups[0].matkl);
    }
  }, [data.materialGroups, selectedMatkl]);

  const industryDef = data.industrySectors.find((i) => i.mbrsh === selectedIndustry);
  const industryFields = data.customIndustryFields.filter(
    (f) => f.industrySector === selectedIndustry
  );
  const activeMaterialGroup = data.materialGroups.find((mg) => mg.matkl === selectedMatkl);
  const activeValuationClass = VALUATION_CLASSES.find(
    (valuationClass) => valuationClass.bklas === activeMaterialGroup?.defaultBklas
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

  const handleCreateMaterialGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanCode = newGroupCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    const res = await onCreateMaterialGroup({
      matkl: cleanCode,
      label: newGroupLabel.trim(),
      classificationClass: newGroupClass.trim(),
      defaultMtart: newGroupMtart,
      defaultBklas: newGroupBklas,
      description: newGroupDesc.trim(),
    });
    if (res.ok) {
      setSelectedMatkl(cleanCode);
      setShowNewGroupForm(false);
      setNewGroupCode('');
      setNewGroupLabel('');
      setNewGroupClass('');
      setNewGroupDesc('');
      setFeedback({
        type: 'ok',
        text: `Material Group ${cleanCode} berhasil dibuat pada T023 tenant ${data.activeTenant.bukrs}. Tetapkan class material type 001, lalu kelola characteristic class di bawah.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal membuat Material Group.' });
    }
  };

  const handleCreateCharacteristicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMaterialGroup) return;
    setFeedback(null);
    const cleanName = newCharName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const finalName = cleanName.startsWith('CHR_') ? cleanName : `CHR_${cleanName}`;

    const charObj: MasterCharacteristic = {
      id: '',
      charName: finalName,
      label: newCharLabel.trim(),
      dataType: newCharType,
      unit: newCharType === 'number' && newCharUnit.trim() ? newCharUnit.trim() : undefined,
      options:
        newCharType === 'select'
          ? newCharOptionsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      required: newCharRequired,
      helpText: newCharHelp.trim() || `Master characteristic untuk ${activeMaterialGroup.label}`,
    };

    const res = await onCreateCharacteristic(activeMaterialGroup.matkl, charObj);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Characteristic ${finalName} ditambahkan ke Class ${activeMaterialGroup.classificationClass} dan berlaku untuk seluruh Material Group yang menggunakan class tersebut.`,
      });
      setNewCharName('');
      setNewCharLabel('');
      setNewCharUnit('');
      setNewCharOptionsRaw('');
      setNewCharHelp('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menambahkan Master Characteristic.' });
    }
  };

  const handleStartEditMaterialGroup = () => {
    if (!activeMaterialGroup) return;
    setEditingGroupMatkl(activeMaterialGroup.matkl);
    setEditGroupLabel(activeMaterialGroup.label);
    setEditGroupClass(activeMaterialGroup.classificationClass || '');
    setEditGroupMtart(activeMaterialGroup.defaultMtart || 'HAWA');
    setEditGroupBklas(activeMaterialGroup.defaultBklas || '3100');
    setEditGroupDesc(activeMaterialGroup.description || '');
    setFeedback(null);
  };

  const handleSaveEditMaterialGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupMatkl) return;
    setFeedback(null);
    const res = await onUpdateMaterialGroup(editingGroupMatkl, {
      label: editGroupLabel.trim(),
      classificationClass: editGroupClass.trim(),
      defaultMtart: editGroupMtart,
      defaultBklas: editGroupBklas,
      description: editGroupDesc.trim(),
    });
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Material Group ${editingGroupMatkl} pada T023 berhasil diperbarui.`,
      });
      setEditingGroupMatkl(null);
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal memperbarui Material Group.' });
    }
  };

  const handleDeleteActiveMaterialGroup = async () => {
    if (!activeMaterialGroup) return;
    setFeedback(null);
    const target = activeMaterialGroup.matkl;
    const res = await onDeleteMaterialGroup(target);
    if (res.ok) {
      setEditingGroupMatkl(null);
      setFeedback({
        type: 'ok',
        text: `Material Group ${target} telah dihapus dari T023.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error || `Gagal menghapus Material Group ${target}.` });
    }
  };

  const handleCreateUomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanMsehi = newUomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const res = await onCreateUom({
      msehi: cleanMsehi,
      label: newUomLabel.trim(),
      isoCode: newUomIso.trim().toUpperCase() || cleanMsehi,
      dimension: newUomDimension,
      decimalPlaces: newUomDecimals,
      description: newUomDesc.trim() || newUomLabel.trim(),
    });
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Satuan ${cleanMsehi} (${newUomLabel.trim()}) berhasil ditambahkan ke Master UoM T006 / CUNI dan langsung tersedia di MARA-MEINS.`,
      });
      setNewUomCode('');
      setNewUomLabel('');
      setNewUomIso('');
      setNewUomDimension('Count');
      setNewUomDecimals(0);
      setNewUomDesc('');
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menambahkan Base Unit of Measure.' });
    }
  };

  const handleStartEditUom = (u: UnitOfMeasureDefinition) => {
    setEditingUomMsehi(u.msehi);
    setEditUomLabel(u.label);
    setEditUomIso(u.isoCode);
    setEditUomDimension(u.dimension);
    setEditUomDesc(u.description);
    setFeedback(null);
  };

  const handleSaveEditUom = async (msehi: string) => {
    setFeedback(null);
    const res = await onUpdateUom(msehi, {
      label: editUomLabel.trim(),
      isoCode: editUomIso.trim().toUpperCase(),
      dimension: editUomDimension,
      description: editUomDesc.trim(),
    });
    if (res.ok) {
      setEditingUomMsehi(null);
      setFeedback({
        type: 'ok',
        text: `Satuan ${msehi} pada Master UoM T006 berhasil diperbarui.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error || `Gagal memperbarui satuan ${msehi}.` });
    }
  };

  const handleDeleteUomClick = async (msehi: string) => {
    setFeedback(null);
    const res = await onDeleteUom(msehi);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Satuan ${msehi} telah dihapus dari Master UoM T006.`,
      });
    } else {
      setFeedback({ type: 'err', text: res.error || `Gagal menghapus satuan ${msehi}.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Selector Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              SPRO Customizing · OMS9, CI_MARA, Material Group (CT04) &amp; Master UoM (CUNI)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi aturan field standar (OMS9), append field industri (CI_MARA), penetapan class material (class type 001) pada Material Group, characteristic CT04 di dalam class, serta Master Base Unit of Measure (T006 / CUNI).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('oms9');
                setFeedback(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'oms9' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Field Status (OMS9)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('append');
                setFeedback(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'append' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Append Field (CI_MARA)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('ct04');
                setFeedback(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'ct04' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Group &amp; Char (CT04)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('cuni');
                setFeedback(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'cuni' ? 'bg-white text-[#0064D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Satuan / UoM (CUNI)
            </button>
          </div>
        </div>

        {(activeSubTab === 'oms9' || activeSubTab === 'append') && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {data.industrySectors.length > 1 ? (
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
            ) : (
              <div className="p-3.5 rounded-md border border-[#0064D9]/30 bg-[#EAF2FD]/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0064D9]">
                      MBRSH · {selectedIndustry} (Mechanical Engineering)
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono font-semibold text-slate-800">
                      MTART · HAWA
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-900">
                      {data.activeTenant.bukrs} · {data.activeTenant.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold">{data.activeTenant.coreBusiness}</span>
                    {' — '}
                    {data.activeTenant.description}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums text-slate-700">
                  <div>
                    <span className="text-slate-500">OMS9 Wajib: </span>
                    <span className="font-bold text-slate-900">
                      {rulesDraft.filter((r) => r.rulesByIndustry[selectedIndustry] === 'required').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">CI_MARA: </span>
                    <span className="font-bold text-[#0064D9]">{industryFields.length} field</span>
                  </div>
                </div>
              </div>
            )}

            {industryDef && (
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{industryDef.label}:</span>{' '}
                {industryDef.regulatoryContext}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'ct04' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                Katalog spreadsheet untuk tenant{' '}
                <span className="font-mono font-semibold text-slate-900">{data.activeTenant.bukrs}</span>{' '}
                (<span className="font-mono tabular-nums">{data.materialGroups.length}/22</span> Material Group ·{' '}
                <span className="font-mono tabular-nums">{(data.classificationClasses || []).length}/55</span> Class CL02)
              </div>
              <span className="text-[11px] text-slate-500">Daftar Material Group dikunci sesuai spreadsheet.</span>
            </div>

            {showNewGroupForm && (
              <form
                onSubmit={handleCreateMaterialGroupSubmit}
                className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kode MATKL
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value.toUpperCase())}
                    placeholder="mis. UN-EXC"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Material Group
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupLabel}
                    onChange={(e) => setNewGroupLabel(e.target.value)}
                    placeholder="mis. Unit - Excavators"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Class Material (Type 001)
                  </label>
                  <select
                    value={newGroupClass}
                    onChange={(e) => setNewGroupClass(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  >
                    <option value="">Pilih Class</option>
                    {data.classificationClasses?.map((item) => (
                      <option key={item.className} value={item.className}>
                        {item.className} · {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    MTART
                  </label>
                  <select
                    value={newGroupMtart}
                    onChange={(e) => setNewGroupMtart(e.target.value as MaterialTypeCode)}
                    className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  >
                    {data.materialTypes.map((mt) => (
                      <option key={mt.mtart} value={mt.mtart}>
                        {mt.mtart}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Val. Class (OMQW)
                  </label>
                  <select
                    value={newGroupBklas}
                    onChange={(e) => setNewGroupBklas(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  >
                    {VALUATION_CLASSES.map((vc) => (
                      <option key={vc.bklas} value={vc.bklas}>
                        {vc.bklas} — {vc.label} (GL {vc.glAccount})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Deskripsi kelompok material"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md whitespace-nowrap"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {data.materialGroups.map((mg) => {
                const isSelected = mg.matkl === selectedMatkl;
                const valuationClass = VALUATION_CLASSES.find(
                  (item) => item.bklas === mg.defaultBklas
                );
                return (
                  <button
                    key={mg.matkl}
                    type="button"
                    onClick={() => {
                      setSelectedMatkl(mg.matkl);
                      setEditingGroupMatkl(null);
                      setFeedback(null);
                    }}
                    className={`p-3 rounded-md border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#EAF2FD] border-[#0064D9] text-[#0064D9]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold">
                        {mg.matkl}
                        {mg.defaultBklas ? (
                          <span className="ml-1.5 font-normal text-[11px] text-slate-500">
                            · {mg.defaultBklas}
                            {valuationClass ? ` → ${valuationClass.glAccount}` : ''}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                        {mg.classNames.length} class
                      </span>
                    </div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{mg.label}</div>
                    <div className={`mt-1 text-[10px] font-mono ${mg.classificationClass ? 'text-slate-500' : 'text-amber-700'}`}>
                      {mg.classNames.join(', ') || 'Class belum dipetakan'}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeMaterialGroup && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <div>
                    <span className="font-mono font-semibold text-slate-900">
                      {activeMaterialGroup.matkl}
                    </span>{' '}
                    · Default{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {activeMaterialGroup.defaultMtart || 'HAWA'}
                    </span>
                    {activeMaterialGroup.defaultBklas ? (
                      <>
                        {' '}· Val. Class{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {activeMaterialGroup.defaultBklas}
                        </span>
                        {activeValuationClass ? (
                          <>
                            {' '}· GL{' '}
                            <span className="font-mono font-semibold text-slate-800">
                              {activeValuationClass.glAccount}
                            </span>
                            {' '}({activeValuationClass.glAccountName})
                          </>
                        ) : null}
                      </>
                    ) : null}{' '}
                    · Class Type 001{' '}
                    <span className={`font-mono font-semibold ${activeMaterialGroup.classificationClass ? 'text-slate-800' : 'text-amber-700'}`}>
                      {activeMaterialGroup.classNames.join(', ') || 'Perlu pemetaan'}
                    </span>{' '}
                    — {activeMaterialGroup.description}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleStartEditMaterialGroup}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Grup</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteActiveMaterialGroup}
                      disabled
                      title="22 Material Group dari spreadsheet tidak dapat dihapus."
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-100 rounded-md whitespace-nowrap cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Grup</span>
                    </button>
                  </div>
                </div>

                {editingGroupMatkl === activeMaterialGroup.matkl && (
                  <form
                    onSubmit={handleSaveEditMaterialGroup}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                  >
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Material Group
                      </label>
                      <input
                        type="text"
                        required
                        readOnly
                        value={editGroupLabel}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Class Material (Type 001)
                      </label>
                      <select
                        value={editGroupClass}
                        onChange={(e) => setEditGroupClass(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                      >
                        <option value="">Pilih Class</option>
                        {data.classificationClasses?.filter((item) =>
                          activeMaterialGroup.classNames.includes(item.className)
                        ).map((item) => (
                          <option key={item.className} value={item.className}>
                            {item.className} · {item.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        MTART
                      </label>
                      <select
                        value={editGroupMtart}
                        onChange={(e) => setEditGroupMtart(e.target.value as MaterialTypeCode)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                      >
                        {data.materialTypes.map((mt) => (
                          <option key={mt.mtart} value={mt.mtart}>
                            {mt.mtart}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Val. Class
                      </label>
                      <select
                        value={editGroupBklas}
                        onChange={(e) => setEditGroupBklas(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md"
                      >
                        {VALUATION_CLASSES.map((vc) => (
                          <option key={vc.bklas} value={vc.bklas}>
                            {vc.bklas} — {vc.label} (GL {vc.glAccount})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Deskripsi T023
                      </label>
                      <input
                        type="text"
                        value={editGroupDesc}
                        onChange={(e) => setEditGroupDesc(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-1.5">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md whitespace-nowrap"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGroupMatkl(null)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-md"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'cuni' && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div>
              Master Satuan Dasar (Base Unit of Measure — <span className="font-mono font-semibold text-slate-900">T006 / CUNI</span>) untuk tenant{' '}
              <span className="font-mono font-semibold text-slate-900">{data.activeTenant.bukrs}</span>.
              Seluruh opsi di dropdown <span className="font-mono">MARA-MEINS</span> pada MM01/MM02 mengacu pada tabel master ini.
            </div>
            <div className="font-mono text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
              {(data.unitsOfMeasure || []).length} satuan terdaftar
            </div>
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
                OMS9 Field Reference Matrix — {data.activeTenant.bukrs} {data.activeTenant.name} (HAWA · Sektor {selectedIndustry})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aturan field status untuk proses bisnis {data.activeTenant.coreBusiness}; langsung mengontrol visibilitas, read-only, dan validasi wajib isi di MM01/MM02.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await onSaveStandardRules(rulesDraft);
                setFeedback(
                  res.ok
                    ? { type: 'ok', text: `Matriks OMS9 untuk ${data.activeTenant.name} (Sektor ${selectedIndustry}) berhasil disimpan dan aktif.` }
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
                  <th className="py-2.5 px-5">Status di {data.activeTenant.name} (Sektor {selectedIndustry})</th>
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
                Tambah Field Append CI_MARA ({data.activeTenant.bukrs} · Sektor {selectedIndustry})
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
                Daftar Field Kustom CI_MARA — {data.activeTenant.name} · Sektor {selectedIndustry} ({industryFields.length})
              </h3>
            </div>
            {industryFields.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada field kustom CI_MARA untuk {data.activeTenant.name} (Sektor {selectedIndustry}).
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

      {/* SUBTAB 3: MASTER CHARACTERISTIC PER MATERIAL GROUP (CT04) */}
      {activeSubTab === 'ct04' && (
        activeMaterialGroup ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleCreateCharacteristicSubmit}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0064D9]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Tambah Characteristic ke Class {activeMaterialGroup.classificationClass}
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Technical Characteristic Name (CT04 · CHR_*)
                </label>
                <input
                  type="text"
                  required
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value.toUpperCase())}
                  placeholder="mis. CHR_DIAMETER atau CHR_EN_STD"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Karakteristik
                </label>
                <input
                  type="text"
                  required
                  value={newCharLabel}
                  onChange={(e) => setNewCharLabel(e.target.value)}
                  placeholder="mis. Rating Tekanan Kerja Maksimum"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipe Data</label>
                  <select
                    value={newCharType}
                    onChange={(e) => setNewCharType(e.target.value as CharacteristicDataType)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                  >
                    <option value="text">Text (CHAR)</option>
                    <option value="number">Number (NUM)</option>
                    <option value="select">Allowed Values (Dropdown)</option>
                    <option value="boolean">Boolean (Yes/No)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Validasi MM01/MM02</label>
                  <select
                    value={newCharRequired ? 'required' : 'optional'}
                    onChange={(e) => setNewCharRequired(e.target.value === 'required')}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                  >
                    <option value="required">Wajib Diisi (Required)</option>
                    <option value="optional">Opsional (Optional)</option>
                  </select>
                </div>
              </div>

              {newCharType === 'number' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit of Measure (Opsional)</label>
                  <input
                    type="text"
                    value={newCharUnit}
                    onChange={(e) => setNewCharUnit(e.target.value)}
                    placeholder="mis. mm, PSI, bar, kg, V"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md"
                  />
                </div>
              )}

              {newCharType === 'select' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Allowed Values (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCharOptionsRaw}
                    onChange={(e) => setNewCharOptionsRaw(e.target.value)}
                    placeholder="mis. Class 150, Class 300, Class 600"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan / Help Text</label>
                <input
                  type="text"
                  value={newCharHelp}
                  onChange={(e) => setNewCharHelp(e.target.value)}
                  placeholder="Petunjuk pengisian karakteristik saat buat material MM01"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Characteristic ke Class {activeMaterialGroup.classificationClass}</span>
              </button>
            </form>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Characteristic di dalam Class (Type 001) — {activeMaterialGroup.classificationClass} ({activeMaterialGroup.characteristics.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Material Group {activeMaterialGroup.matkl} menggunakan class ini. Perubahan characteristic berlaku untuk semua Material Group yang menggunakan class tersebut.
                  </p>
                </div>
                {activeMaterialGroup.characteristics.length > 0 && (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs">
                    <span className="text-slate-500">Format Short Name (MARA-MAKTX): </span>
                    <span className="font-mono font-semibold text-[#0064D9]">
                      {formatCharacteristicPattern(activeMaterialGroup)}
                    </span>
                  </div>
                )}
              </div>

              {activeMaterialGroup.characteristics.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Belum ada characteristic pada Class {activeMaterialGroup.classificationClass}. Tambahkan lewat form di kiri.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {activeMaterialGroup.characteristics.map((ch, idx) => {
                    const chars = activeMaterialGroup.characteristics;
                    const moveChar = async (delta: -1 | 1) => {
                      const targetIdx = idx + delta;
                      if (targetIdx < 0 || targetIdx >= chars.length) return;
                      const ids = chars.map((item) => item.id);
                      const [moved] = ids.splice(idx, 1);
                      ids.splice(targetIdx, 0, moved);
                      const res = await onReorderCharacteristics(activeMaterialGroup.matkl, ids);
                      if (res.ok) {
                        setFeedback({
                          type: 'ok',
                          text: `Urutan karakteristik ${activeMaterialGroup.matkl} diperbarui — Format Short Name kini mengikuti urutan baru.`,
                        });
                      }
                    };
                    return (
                      <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-500 tabular-nums">
                              #{idx + 1}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#0064D9]">{ch.charName}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs font-semibold text-slate-900">{ch.label}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Tipe: <span className="font-mono">{ch.dataType}</span>
                            {ch.unit ? ` (${ch.unit})` : ''}
                            {ch.options && ch.options.length > 0 ? ` · Nilai: ${ch.options.join(', ')}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{ch.helpText}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveChar(-1)}
                            title="Naikkan urutan"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === chars.length - 1}
                            onClick={() => moveChar(1)}
                            title="Turunkan urutan"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <select
                            value={ch.required ? 'required' : 'optional'}
                            onChange={(e) =>
                              onUpdateCharacteristic(activeMaterialGroup.matkl, {
                                ...ch,
                                required: e.target.value === 'required',
                              })
                            }
                            aria-label={`Validasi untuk ${ch.charName}`}
                            className={`px-2.5 py-1.5 text-xs font-medium border rounded-md ${
                              ch.required
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="required">Wajib (Required)</option>
                            <option value="optional">Opsional</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onDeleteCharacteristic(activeMaterialGroup.matkl, ch.id)}
                            title="Hapus karakteristik"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500">
            Belum ada Material Group pada tenant aktif. Gunakan tombol Tambah Material Group (T023) di atas.
          </div>
        )
      )}

      {/* SUBTAB 4: MASTER BASE UNIT OF MEASURE (T006 / CUNI) */}
      {activeSubTab === 'cuni' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateUomSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#0064D9]" />
              <h3 className="text-sm font-semibold text-slate-900">
                Tambah Base Unit of Measure (T006 / CUNI)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kode Satuan (MSEHI)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newUomCode}
                  onChange={(e) => setNewUomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="mis. KLT, UN, HR"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ISO Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newUomIso}
                  onChange={(e) => setNewUomIso(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="mis. KGM, LTR, PCE"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Satuan (Commercial Label)
              </label>
              <input
                type="text"
                required
                value={newUomLabel}
                onChange={(e) => setNewUomLabel(e.target.value)}
                placeholder="mis. Koli / Crate atau Jam Operasi"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0064D9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dimensi</label>
                <select
                  value={newUomDimension}
                  onChange={(e) => setNewUomDimension(e.target.value as UomDimension)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
                >
                  {UOM_DIMENSIONS.map((dim) => (
                    <option key={dim} value={dim}>
                      {dim}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Decimal Places</label>
                <select
                  value={newUomDecimals}
                  onChange={(e) => setNewUomDecimals(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-md"
                >
                  <option value={0}>0 (Bilangan Bulat)</option>
                  <option value={2}>2 (0.00)</option>
                  <option value={3}>3 (0.000)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan Penggunaan</label>
              <input
                type="text"
                value={newUomDesc}
                onChange={(e) => setNewUomDesc(e.target.value)}
                placeholder="mis. Satuan pengemasan ekspor / heavy cargo"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Satuan ke Master UoM (T006)</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Daftar Master Base Unit of Measure ({(data.unitsOfMeasure || []).length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Satuan yang sedang dipakai material di MARA tidak dapat dihapus hingga material diperbarui.
                </p>
              </div>
            </div>

            {(data.unitsOfMeasure || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada satuan terdaftar di T006.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">MSEHI</th>
                      <th className="py-2.5 px-4">Nama Satuan &amp; Deskripsi</th>
                      <th className="py-2.5 px-4">Dimensi</th>
                      <th className="py-2.5 px-4">Desimal</th>
                      <th className="py-2.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(data.unitsOfMeasure || []).map((u) => {
                      const isEditing = editingUomMsehi === u.msehi;
                      return (
                        <tr key={u.msehi} className="hover:bg-slate-50">
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-bold text-[#0064D9]">{u.msehi}</div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                              ISO: {u.isoCode}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editUomLabel}
                                  onChange={(e) => setEditUomLabel(e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                                  placeholder="Nama satuan"
                                />
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={editUomIso}
                                    onChange={(e) =>
                                      setEditUomIso(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                                    }
                                    className="w-24 px-2 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded"
                                    placeholder="ISO"
                                  />
                                  <input
                                    type="text"
                                    value={editUomDesc}
                                    onChange={(e) => setEditUomDesc(e.target.value)}
                                    className="flex-1 px-2 py-1 text-[11px] bg-white border border-slate-300 rounded"
                                    placeholder="Deskripsi"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-semibold text-slate-900">{u.label}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{u.description}</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            {isEditing ? (
                              <select
                                value={editUomDimension}
                                onChange={(e) => setEditUomDimension(e.target.value as UomDimension)}
                                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                              >
                                {UOM_DIMENSIONS.map((dim) => (
                                  <option key={dim} value={dim}>
                                    {dim}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-block px-2 py-0.5 font-mono text-[11px] bg-slate-100 border border-slate-200 text-slate-700 rounded">
                                {u.dimension}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <select
                              value={u.decimalPlaces}
                              onChange={(e) =>
                                onUpdateUom(u.msehi, { decimalPlaces: Number(e.target.value) })
                              }
                              aria-label={`Desimal untuk ${u.msehi}`}
                              className="px-2 py-1 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                            >
                              <option value={0}>0</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditUom(u.msehi)}
                                    className="px-2 py-1 text-[11px] font-semibold text-white bg-[#0064D9] hover:bg-[#0052B4] rounded whitespace-nowrap"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUomMsehi(null)}
                                    className="p-1 text-slate-500 hover:text-slate-900 rounded"
                                    title="Batal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUom(u)}
                                    title={`Edit ${u.msehi}`}
                                    className="p-1.5 text-slate-400 hover:text-[#0064D9] hover:bg-slate-100 rounded transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUomClick(u.msehi)}
                                    title={`Hapus ${u.msehi}`}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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
      )}
    </div>
  );
}
