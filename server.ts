import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  buildMtCalibrationWorkspace,
  CORE_BUSINESS_OPTIONS,
  createDefaultUnitsOfMeasure,
  createInitialMultiTenantDatabase,
  createStandardFieldRulesForBusiness,
  createStandardizedMaterialGroups,
  createTemplateCustomFields,
  createTemplateMaterialGroups,
  createTenantTemplateWorkspace,
  INDUSTRY_SECTORS,
  MATERIAL_TYPES,
  TENANT_COMPANIES,
  VALUATION_TYPES,
} from './server/seedData.ts';
import type {
  ChangeDocument,
  CustomIndustryField,
  MasterCharacteristic,
  MaterialDocument,
  MaterialGroupDefinition,
  MaterialMasterRecord,
  MaterialTypeCode,
  MovementTypeCode,
  MultiTenantDatabase,
  PurchaseOrder,
  PurchaseRequisition,
  SapBootstrapPayload,
  SplitValuationItem,
  StandardFieldRule,
  TenantCompany,
  TenantCoreBusinessType,
  TenantSummary,
  TenantWorkspaceData,
  UnitOfMeasureDefinition,
  UomDimension,
  ValuationTypeCode,
} from './src/types/sap.ts';
import { buildMaterialShortDescription } from './src/utils/format.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROD_DATA_DIR = '/app/data';
const LOCAL_DATA_DIR = path.join(__dirname, 'data');

function resolveDataDir(): string {
  if (process.env.SAP_DATA_DIR && process.env.SAP_DATA_DIR.trim()) {
    return process.env.SAP_DATA_DIR.trim();
  }
  if (fs.existsSync(PROD_DATA_DIR)) {
    return PROD_DATA_DIR;
  }
  if (__dirname === '/app') {
    return PROD_DATA_DIR;
  }
  try {
    fs.accessSync('/app', fs.constants.W_OK);
    return PROD_DATA_DIR;
  } catch {
    return LOCAL_DATA_DIR;
  }
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'sap-store.json');

function createDatabaseBackup(sourceFile: string, reason: string): string {
  const safeReason = reason.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(DATA_DIR, `sap-store.backup-${safeReason}-${stamp}.json`);
  const sourceStat = fs.statSync(sourceFile);
  fs.copyFileSync(sourceFile, backupFile, fs.constants.COPYFILE_EXCL);
  const backupStat = fs.statSync(backupFile);
  if (!fs.existsSync(backupFile) || backupStat.size !== sourceStat.size || backupStat.size === 0) {
    throw new Error(`Verifikasi backup gagal untuk ${backupFile}.`);
  }
  return backupFile;
}

function saveDatabase(db: MultiTenantDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const serialized = JSON.stringify(db, null, 2);
  const tempFile = path.join(DATA_DIR, `sap-store.tmp-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tempFile, serialized, 'utf-8');
  try {
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EBUSY' || code === 'EXDEV') {
      fs.writeFileSync(DB_FILE, serialized, 'utf-8');
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // ignore cleanup error
      }
      return;
    }
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore cleanup error
    }
    throw err;
  }
}

function remapMatnrPrefix(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/^400000(\d{3})$/, '200000$1');
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = remapMatnrPrefix(value[i]);
    }
    return value;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      (value as Record<string, unknown>)[key] = remapMatnrPrefix(child);
    }
  }
  return value;
}

function loadDatabase(): MultiTenantDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialMultiTenantDatabase();
    saveDatabase(initial);
    return initial;
  }

  let parsed: Partial<MultiTenantDatabase>;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    parsed = JSON.parse(raw) as Partial<MultiTenantDatabase>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Database ${DB_FILE} rusak atau bukan JSON valid (${msg}). File database lama dipertahankan dan TIDAK ditimpa.`
    );
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.schemaVersion !== 'number' ||
    parsed.schemaVersion < 2 ||
    !Array.isArray(parsed.tenantCompanies) ||
    typeof parsed.workspaces !== 'object' ||
    parsed.workspaces === null
  ) {
    throw new Error(
      `Format database ${DB_FILE} tidak dikenal atau tidak kompatibel. File database lama dipertahankan dan TIDAK ditimpa.`
    );
  }

  const currentVersion = parsed.schemaVersion;
  if (currentVersion < 17) {
    try {
      createDatabaseBackup(DB_FILE, `pre-v${currentVersion}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Backup sebelum migrasi database gagal dibuat (${msg}). Migrasi dihentikan tanpa mengubah ${DB_FILE}.`
      );
    }

    if (parsed.schemaVersion < 3) {
      const freshSeed = createInitialMultiTenantDatabase();
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) {
          parsed.workspaces[company.tenantId] = createTenantTemplateWorkspace(
            company,
            company.coreBusinessType
          );
          continue;
        }
        if (!ws.materialGroups || ws.materialGroups.length === 0) {
          ws.materialGroups = createTemplateMaterialGroups(company.coreBusinessType);
        }
        const seedMaterials = freshSeed.workspaces[company.tenantId]?.materials || [];
        for (const mat of ws.materials) {
          if (!mat.characteristics) {
            const matchedSeed = seedMaterials.find((sm) => sm.mara.matnr === mat.mara.matnr);
            mat.characteristics = matchedSeed?.characteristics
              ? structuredClone(matchedSeed.characteristics)
              : {};
          }
        }
      }
      parsed.schemaVersion = 3;
    }

    if (parsed.schemaVersion < 4) {
      const freshSeed = createInitialMultiTenantDatabase();
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;
        const templateGroups = createTemplateMaterialGroups(company.coreBusinessType);
        if (!ws.materialGroups) ws.materialGroups = [];
        for (const tg of templateGroups) {
          if (!ws.materialGroups.some((mg) => mg.matkl === tg.matkl)) {
            ws.materialGroups.unshift(tg);
          }
        }
        const seedMaterials = freshSeed.workspaces[company.tenantId]?.materials || [];
        for (const sm of seedMaterials) {
          if (sm.mara.matkl === 'LIGHT-VEH' && !ws.materials.some((m) => m.mara.matnr === sm.mara.matnr)) {
            ws.materials.push(structuredClone(sm));
          }
        }
      }
      parsed.schemaVersion = 4;
    }

    if (parsed.schemaVersion < 5) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws?.customIndustryFields) continue;
        for (const cf of ws.customIndustryFields) {
          if (cf.fieldName === 'ZZ_CHASSIS_SERIES' && cf.status === 'required') {
            cf.status = 'optional';
          }
        }
      }
      parsed.schemaVersion = 5;
    }

    if (parsed.schemaVersion < 6) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;
        if (!ws.materialGroups) ws.materialGroups = [];
        const templateGroups = createTemplateMaterialGroups(company.coreBusinessType);
        for (const tg of templateGroups) {
          if (
            (tg.matkl === 'HEAVY-EQ' || tg.matkl === 'LUBRICANT') &&
            !ws.materialGroups.some((mg) => mg.matkl === tg.matkl)
          ) {
            ws.materialGroups.push(tg);
          }
        }
      }
      parsed.schemaVersion = 6;
    }

    if (parsed.schemaVersion < 7) {
      const defaults = createDefaultUnitsOfMeasure();
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;
        if (!ws.unitsOfMeasure || ws.unitsOfMeasure.length === 0) {
          ws.unitsOfMeasure = structuredClone(defaults);
        } else {
          for (const def of defaults) {
            if (!ws.unitsOfMeasure.some((u) => u.msehi === def.msehi)) {
              ws.unitsOfMeasure.push(structuredClone(def));
            }
          }
        }
      }
      parsed.schemaVersion = 7;
    }

    if (parsed.schemaVersion < 8) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;
        if (!ws.materialGroups) ws.materialGroups = [];
        const templateGroups = createTemplateMaterialGroups(company.coreBusinessType);
        const lightVehGroup = templateGroups.find((tg) => tg.matkl === 'LIGHT-VEH');
        if (lightVehGroup && !ws.materialGroups.some((mg) => mg.matkl === 'LIGHT-VEH')) {
          ws.materialGroups.push(structuredClone(lightVehGroup));
        }
      }
      parsed.schemaVersion = 8;
    }

    if (parsed.schemaVersion < 9) {
      const presetById = new Map(TENANT_COMPANIES.map((t) => [t.tenantId, t]));
      for (let i = 0; i < parsed.tenantCompanies.length; i++) {
        const existing = parsed.tenantCompanies[i];
        const preset = presetById.get(existing.tenantId);
        if (preset) {
          parsed.tenantCompanies[i] = structuredClone(preset);
        }
      }

      const mtPreset = presetById.get('tenant-mt');
      if (mtPreset && !parsed.tenantCompanies.some((c) => c.tenantId === 'tenant-mt')) {
        parsed.tenantCompanies.push(structuredClone(mtPreset));
      }
      if (!parsed.workspaces['tenant-mt']) {
        parsed.workspaces['tenant-mt'] = buildMtCalibrationWorkspace();
      }

      const presetOrder = new Map(TENANT_COMPANIES.map((t, idx) => [t.tenantId, idx]));
      parsed.tenantCompanies.sort((a, b) => {
        const idxA = presetOrder.has(a.tenantId) ? presetOrder.get(a.tenantId)! : Number.MAX_SAFE_INTEGER;
        const idxB = presetOrder.has(b.tenantId) ? presetOrder.get(b.tenantId)! : Number.MAX_SAFE_INTEGER;
        return idxA - idxB;
      });

      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        for (const plant of ws.plants || []) {
          plant.bukrs = company.bukrs;
        }
        for (const vendor of ws.vendors || []) {
          vendor.ekorg = company.bukrs;
        }
        for (const mg of ws.materialGroups || []) {
          mg.defaultMtart = 'HAWA';
        }
        for (const mat of ws.materials || []) {
          // Pertahankan mara.matnr agar relasi PR/PO/MIGO/CDHDR tetap utuh, namun seragamkan MTART & VKORG
          mat.mara.mtart = 'HAWA';
          if (mat.mvke) {
            mat.mvke.vkorg = company.bukrs;
          }
        }
      }

      parsed.schemaVersion = 9;
    }

    if (parsed.schemaVersion < 10) {
      const defaultUoms = createDefaultUnitsOfMeasure();
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        const standardGroups = createStandardizedMaterialGroups(company.coreBusinessType);
        const existingByMatkl = new Map((ws.materialGroups || []).map((g) => [g.matkl, g]));
        const mergedGroups: MaterialGroupDefinition[] = [];

        for (const std of standardGroups) {
          const prev = existingByMatkl.get(std.matkl);
          if (prev) {
            mergedGroups.push({
              ...std,
              characteristics:
                prev.characteristics && prev.characteristics.length > 0
                  ? prev.characteristics
                  : structuredClone(std.characteristics),
            });
            existingByMatkl.delete(std.matkl);
          } else {
            mergedGroups.push(structuredClone(std));
          }
        }

        // Pertahankan Material Group kustom/lama (mis. MATERIAL, TOOLS, HEAVY-VECH, OCTG-PIPE, dll.)
        for (const rem of existingByMatkl.values()) {
          mergedGroups.push({
            ...rem,
            defaultMtart: 'HAWA',
            defaultBklas:
              rem.defaultBklas ||
              (rem.matkl === 'HEAVY-EQ' || rem.matkl === 'HEAVY-VECH' || rem.matkl === 'LIGHT-VEH' || rem.matkl === 'UNIT-WL'
                ? '3500'
                : rem.matkl === 'LUBRICANT' || rem.matkl === 'LUBE-HD'
                ? '3030'
                : '3100'),
          });
        }
        ws.materialGroups = mergedGroups;

        if (!ws.unitsOfMeasure) ws.unitsOfMeasure = [];
        for (const def of defaultUoms) {
          if (!ws.unitsOfMeasure.some((u) => u.msehi === def.msehi)) {
            ws.unitsOfMeasure.push(structuredClone(def));
          }
        }
      }

      parsed.schemaVersion = 10;
    }

    if (parsed.schemaVersion < 11) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        const standardGroups = createStandardizedMaterialGroups(company.coreBusinessType);
        const existingByMatkl = new Map((ws.materialGroups || []).map((g) => [g.matkl, g]));
        const mergedGroups: MaterialGroupDefinition[] = [];

        for (const std of standardGroups) {
          const prev = existingByMatkl.get(std.matkl);
          if (prev) {
            mergedGroups.push({
              ...std,
              characteristics:
                prev.characteristics && prev.characteristics.length > 0
                  ? prev.characteristics
                  : structuredClone(std.characteristics),
            });
            existingByMatkl.delete(std.matkl);
          } else {
            mergedGroups.push(structuredClone(std));
          }
        }

        for (const rem of existingByMatkl.values()) {
          mergedGroups.push(rem);
        }
        ws.materialGroups = mergedGroups;
      }

      parsed.schemaVersion = 11;
    }

    if (parsed.schemaVersion < 12) {
      const removedGroups = new Set(['LIGHT-VEH', 'HEAVY-EQ', 'LUBRICANT']);
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        for (const mat of ws.materials || []) {
          if (mat.mara.matkl === 'LIGHT-VEH') {
            mat.mara.matkl = 'UN-LVH';
            const oldChars = mat.characteristics || {};
            const typeMap: Record<string, string> = {
              DC: 'Double Cabin',
              SUV: 'SUV Operasional',
              MPV: 'Minibus Kru',
              Pickup: 'Single Cabin',
            };
            mat.characteristics = {
              CHR_LV_MODEL: oldChars.CHR_LV_MODEL || oldChars.CHR_NAMA || 'Hilux',
              CHR_LV_TYPE: oldChars.CHR_LV_TYPE || typeMap[String(oldChars.CHR_TYPE || '')] || 'Double Cabin',
              CHR_LV_TRANS: oldChars.CHR_LV_TRANS || oldChars.CHR_TRANSMISI || 'Manual',
              CHR_LV_DRIVE:
                oldChars.CHR_LV_DRIVE || (oldChars.CHR_GARDAN === '2x4' ? '4x2' : oldChars.CHR_GARDAN) || '4x4',
              CHR_LV_BRAND: oldChars.CHR_LV_BRAND || oldChars.CHR_BRAND || 'Toyota',
            };
            for (const mb of Object.values(mat.mbew || {})) {
              mb.bklas = '3500';
              if (mb.splitValuations) {
                for (const sv of Object.values(mb.splitValuations)) {
                  if (sv) sv.bklas = '3500';
                }
              }
            }
          } else if (mat.mara.matkl === 'HEAVY-EQ') {
            mat.mara.matkl = 'UN-EXC';
          } else if (mat.mara.matkl === 'LUBRICANT') {
            mat.mara.matkl = 'MN-LUB';
          }
        }

        ws.materialGroups = (ws.materialGroups || []).filter((mg) => !removedGroups.has(mg.matkl));
      }

      parsed.schemaVersion = 12;
    }

    if (parsed.schemaVersion < 13) {
      for (const company of parsed.tenantCompanies) {
        company.defaultIndustry = 'M';
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        for (const mat of ws.materials || []) {
          mat.mara.mbrsh = 'M';
          if (!mat.industryExtensions) mat.industryExtensions = {};
          if (company.coreBusinessType === 'oil_gas_contractor' && !mat.industryExtensions.ZZ_PROJECT_SCOPE) {
            mat.industryExtensions.ZZ_PROJECT_SCOPE =
              mat.mara.matkl === 'OCTG-PIPE' || mat.mara.matkl === 'VALVE-HP'
                ? 'Piping & Facility EPC'
                : 'Maintenance Oil & Gas';
          } else if (company.coreBusinessType === 'tools_ppe' && !mat.industryExtensions.ZZ_SALES_CHANNEL) {
            mat.industryExtensions.ZZ_SALES_CHANNEL =
              mat.mara.matkl === 'INST-CAL' || mat.mara.matkl === 'TOOL-TORQ'
                ? 'Service Kalibrasi Alat'
                : 'Intercompany & External';
          } else if (company.coreBusinessType === 'unit_spareparts' && !mat.industryExtensions.ZZ_SALES_LINE) {
            mat.industryExtensions.ZZ_SALES_LINE = 'Genuine Spare Part';
          }
        }

        ws.standardFieldRules = createStandardFieldRulesForBusiness(company.coreBusinessType);

        const templateCustom = createTemplateCustomFields(company.coreBusinessType);
        const templateByName = new Map(templateCustom.map((cf) => [cf.fieldName, cf]));
        const mergedCustomFields: CustomIndustryField[] = templateCustom.map((cf) => structuredClone(cf));
        for (const existingCf of ws.customIndustryFields || []) {
          if (!templateByName.has(existingCf.fieldName)) {
            mergedCustomFields.push({
              ...existingCf,
              industrySector: 'M',
            });
          }
        }
        ws.customIndustryFields = mergedCustomFields;
      }

      parsed.schemaVersion = 13;
    }

    if (parsed.schemaVersion < 14) {
      for (const company of parsed.tenantCompanies) {
        company.defaultIndustry = 'M';
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        for (const mat of ws.materials || []) {
          mat.mara.mbrsh = 'M';
        }

        ws.standardFieldRules = createStandardFieldRulesForBusiness(company.coreBusinessType);

        const templateCustom = createTemplateCustomFields(company.coreBusinessType);
        const templateByName = new Map(templateCustom.map((cf) => [cf.fieldName, cf]));
        const normalizedFields: CustomIndustryField[] = [];
        const seenNames = new Set<string>();

        for (const existingCf of ws.customIndustryFields || []) {
          if (seenNames.has(existingCf.fieldName)) continue;
          seenNames.add(existingCf.fieldName);
          normalizedFields.push({
            ...existingCf,
            industrySector: 'M',
          });
        }
        for (const tplCf of templateCustom) {
          if (!seenNames.has(tplCf.fieldName)) {
            seenNames.add(tplCf.fieldName);
            normalizedFields.push(structuredClone(tplCf));
          } else {
            // Ensure template field exists cleanly with industrySector: 'M'
            void templateByName;
          }
        }
        ws.customIndustryFields = normalizedFields;
      }

      parsed.schemaVersion = 14;
    }

    if (parsed.schemaVersion < 15) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;

        const standardGroups = createStandardizedMaterialGroups(company.coreBusinessType);
        ws.materialGroups = structuredClone(standardGroups);

        for (const mat of ws.materials || []) {
          normalizeCorporateMara(mat);
        }
      }

      const corporateByMatnr = new Map<string, MaterialMasterRecord>();
      for (const company of parsed.tenantCompanies) {
        for (const mat of parsed.workspaces[company.tenantId]?.materials || []) {
          if (!corporateByMatnr.has(mat.mara.matnr)) {
            const corporateMat = structuredClone(mat);
            corporateMat.mara.mbrsh = 'M';
            corporateMat.mara.mtart = 'HAWA';
            corporateByMatnr.set(corporateMat.mara.matnr, corporateMat);
          }
        }
      }
      parsed.corporateMaraMaterials = Array.from(corporateByMatnr.values());
      for (const corporateMaterial of parsed.corporateMaraMaterials) {
        syncCorporateMaterial(parsed as MultiTenantDatabase, corporateMaterial);
      }
      parsed.schemaVersion = 15;
    }

    if (parsed.schemaVersion < 16) {
      for (const company of parsed.tenantCompanies) {
        const ws = parsed.workspaces[company.tenantId];
        if (!ws) continue;
        ws.materialGroups = structuredClone(createStandardizedMaterialGroups(company.coreBusinessType));
        for (const mat of ws.materials || []) {
          normalizeCorporateMara(mat);
        }
      }
      for (const mat of parsed.corporateMaraMaterials || []) {
        normalizeCorporateMara(mat);
      }
      parsed.schemaVersion = 16;
    }

    if (parsed.schemaVersion < 17) {
      remapMatnrPrefix(parsed);
      parsed.schemaVersion = 17;
    }

    saveDatabase(parsed as MultiTenantDatabase);
  }

  return parsed as MultiTenantDatabase;
}

function resolveTenantContext(
  db: MultiTenantDatabase,
  req: express.Request
): { tenantId: string; company: TenantCompany; workspace: TenantWorkspaceData } {
  const requested =
    (typeof req.query.tenantId === 'string' && req.query.tenantId.trim()) ||
    req.header('x-tenant-id')?.trim() ||
    db.activeTenantId;

  const company =
    db.tenantCompanies.find((t) => t.tenantId === requested) || db.tenantCompanies[0];

  const workspace = db.workspaces[company.tenantId];
  return { tenantId: company.tenantId, company, workspace };
}

function buildTenantSummaries(db: MultiTenantDatabase): TenantSummary[] {
  return db.tenantCompanies.map((company) => {
    const ws = db.workspaces[company.tenantId];
    const totalInventoryValue = (ws?.materials || []).reduce(
      (sum, mat) => sum + Object.values(mat.mbew).reduce((acc, m) => acc + m.salk3, 0),
      0
    );
    return {
      ...company,
      materialCount: ws?.materials.length || 0,
      plantCount: ws?.plants.length || 0,
      totalInventoryValue,
      openPrCount: ws?.purchaseRequisitions.filter((p) => p.status !== 'Converted to PO').length || 0,
      openPoCount: ws?.purchaseOrders.filter((p) => p.status !== 'Completed').length || 0,
    };
  });
}

function buildBootstrapPayload(
  db: MultiTenantDatabase,
  tenantId: string
): SapBootstrapPayload {
  const company = db.tenantCompanies.find((t) => t.tenantId === tenantId) || db.tenantCompanies[0];
  const ws = db.workspaces[company.tenantId];
  return {
    activeTenant: company,
    tenants: buildTenantSummaries(db),
    corporateMaraMaterials: db.corporateMaraMaterials || [],
    materials: ws.materials,
    purchaseRequisitions: ws.purchaseRequisitions,
    purchaseOrders: ws.purchaseOrders,
    materialDocuments: ws.materialDocuments,
    customIndustryFields: ws.customIndustryFields,
    standardFieldRules: ws.standardFieldRules,
    materialGroups: ws.materialGroups || [],
    unitsOfMeasure: ws.unitsOfMeasure || [],
    changeDocuments: ws.changeDocuments,
    plants: ws.plants,
    vendors: ws.vendors,
    materialTypes: MATERIAL_TYPES,
    industrySectors: INDUSTRY_SECTORS,
    valuationTypes: VALUATION_TYPES,
  };
}

function nextSequence(prefix: string, existing: string[], padLength: number): string {
  let maxNum = 0;
  for (const code of existing) {
    if (code.startsWith(prefix)) {
      const tail = Number.parseInt(code.slice(prefix.length), 10);
      if (!Number.isNaN(tail) && tail > maxNum) {
        maxNum = tail;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(padLength, '0')}`;
}

function nextChangeNumber(logs: ChangeDocument[]): string {
  let max = 100;
  for (const item of logs) {
    const num = Number.parseInt(item.changenr.replace('CHG-', ''), 10);
    if (!Number.isNaN(num) && num > max) {
      max = num;
    }
  }
  return `CHG-${String(max + 1).padStart(6, '0')}`;
}

function generateInternalMaterialNumber(
  mtart: MaterialTypeCode,
  materials: MaterialMasterRecord[]
): string {
  const mtDef = MATERIAL_TYPES.find((m) => m.mtart === mtart) || MATERIAL_TYPES[0];
  const prefix = mtDef.internalNumberPrefix;
  let maxSeq = 100;
  for (const m of materials) {
    if (m.mara.matnr.startsWith(prefix)) {
      const tail = Number.parseInt(m.mara.matnr.slice(prefix.length), 10);
      if (!Number.isNaN(tail) && tail >= maxSeq) {
        maxSeq = tail + 1;
      }
    }
  }
  return `${prefix}${String(maxSeq).padStart(3, '0')}`;
}

function normalizeCorporateMara(material: MaterialMasterRecord): void {
  material.mara.mbrsh = 'M';
  material.mara.mtart = 'HAWA';

  const legacyGroupMap: Record<string, string> = {
    'UNIT-WL': 'UN-LVH',
    'PART-ELEC': 'HE-ENG',
    'PART-UC': 'HE-UND',
    'OCTG-PIPE': 'HE-HYD',
    'VALVE-HP': 'HE-HYD',
    'DRILL-MUD': 'MN-LUB',
    'LUBE-HD': 'MN-LUB',
    'FLT-KIT': 'MN-FLT',
    'HYD-PUMP': 'HE-HYD',
    'CAL-INST': 'SV-CAL',
    'INST-CAL': 'IN-MSR',
    'PPE-HEAD': 'SF-APD',
    'PPE-FALL': 'SF-APD',
    'TOOL-TORQ': 'TL-HND',
    'TOOL-HAND': 'TL-HND',
    'INST-GAS': 'IN-GAS',
  };
  material.mara.matkl = legacyGroupMap[material.mara.matkl] || material.mara.matkl;
}

function syncCorporateMaterial(db: MultiTenantDatabase, source: MaterialMasterRecord): void {
  normalizeCorporateMara(source);
  if (!db.corporateMaraMaterials) db.corporateMaraMaterials = [];

  const centralIdx = db.corporateMaraMaterials.findIndex(
    (material) => material.mara.matnr === source.mara.matnr
  );
  if (centralIdx >= 0) {
    db.corporateMaraMaterials[centralIdx] = structuredClone(source);
  } else {
    db.corporateMaraMaterials.unshift(structuredClone(source));
  }

  for (const company of db.tenantCompanies) {
    const ws = db.workspaces[company.tenantId];
    if (!ws) continue;
    const tenantIdx = ws.materials.findIndex(
      (material) => material.mara.matnr === source.mara.matnr
    );
    if (tenantIdx >= 0) {
      const existing = ws.materials[tenantIdx];
      existing.mara = structuredClone(source.mara);
      existing.characteristics = structuredClone(source.characteristics || {});
    } else {
      ws.materials.unshift(structuredClone(source));
    }
  }
}

function removeCorporateMaterial(db: MultiTenantDatabase, matnr: string): void {
  if (db.corporateMaraMaterials) {
    db.corporateMaraMaterials = db.corporateMaraMaterials.filter(
      (material) => material.mara.matnr !== matnr
    );
  }
  for (const company of db.tenantCompanies) {
    const ws = db.workspaces[company.tenantId];
    if (ws) {
      ws.materials = ws.materials.filter((material) => material.mara.matnr !== matnr);
    }
  }
}

function validateMaterialAgainstOms9(
  material: MaterialMasterRecord,
  ws: TenantWorkspaceData,
  activeWerks: string
): string[] {
  const errors: string[] = [];
  const mbrsh = material.mara.mbrsh;

  if (!material.mara.matnr.trim()) errors.push('Material Number (MARA-MATNR) wajib diisi.');
  if (!INDUSTRY_SECTORS.some((ind) => ind.mbrsh === material.mara.mbrsh)) {
    errors.push(
      `Industry Sector "${material.mara.mbrsh || '-'}" tidak diizinkan. Sistem saat ini hanya menggunakan Sektor Industri ${INDUSTRY_SECTORS.map((i) => i.mbrsh).join(', ')} (HAWA).`
    );
  }
  if (!MATERIAL_TYPES.some((mt) => mt.mtart === material.mara.mtart)) {
    errors.push(
      `Material Type "${material.mara.mtart || '-'}" tidak diizinkan. Sistem saat ini hanya mengizinkan Material Type ${MATERIAL_TYPES.map((m) => m.mtart).join(', ')}.`
    );
  }
  if (!material.mara.maktx.trim()) errors.push('Material Description (MARA-MAKTX) wajib diisi.');
  if (!material.mara.meins.trim()) {
    errors.push('Base Unit of Measure (MARA-MEINS) wajib diisi.');
  } else if (
    (ws.unitsOfMeasure || []).length > 0 &&
    !ws.unitsOfMeasure.some((u) => u.msehi === material.mara.meins)
  ) {
    errors.push(
      `Base Unit of Measure "${material.mara.meins}" tidak terdaftar pada Master Satuan (T006 / CUNI) tenant ini.`
    );
  }

  const plantData = material.marc[activeWerks];
  const storageKeys = Object.keys(material.mard).filter((k) => k.startsWith(`${activeWerks}-`));
  const firstStorage = storageKeys.length > 0 ? material.mard[storageKeys[0]] : undefined;
  const mbewData = material.mbew[activeWerks];

  for (const rule of ws.standardFieldRules) {
    const status = rule.rulesByIndustry[mbrsh];
    if (status !== 'required') continue;

    let value: unknown = undefined;
    if (rule.tableName === 'MARA') {
      value = (material.mara as unknown as Record<string, unknown>)[rule.fieldKey];
    } else if (rule.tableName === 'MARC' && plantData) {
      value = (plantData as unknown as Record<string, unknown>)[rule.fieldKey];
    } else if (rule.tableName === 'MARD' && firstStorage) {
      value = (firstStorage as unknown as Record<string, unknown>)[rule.fieldKey];
    } else if (rule.tableName === 'MBEW' && mbewData) {
      value = (mbewData as unknown as Record<string, unknown>)[rule.fieldKey];
    }

    if (rule.fieldKey === 'xchpf' || rule.fieldKey === 'kautb') {
      if (rule.fieldKey === 'xchpf' && value !== true) {
        errors.push(`OMS9 [${mbrsh}]: ${rule.label} (${rule.technicalName}) wajib diaktifkan untuk sektor industri ini.`);
      }
      continue;
    }

    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'number' && value <= 0)
    ) {
      errors.push(`OMS9 [${mbrsh}]: ${rule.label} (${rule.technicalName}) wajib diisi.`);
    }
  }

  const relevantCustomFields = ws.customIndustryFields.filter(
    (cf) => cf.industrySector === mbrsh && cf.status === 'required'
  );
  for (const cf of relevantCustomFields) {
    const val = material.industryExtensions?.[cf.fieldName];
    if (cf.dataType === 'boolean') continue;
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      errors.push(`CI_MARA [${mbrsh}]: Field spesifik industri "${cf.label}" (${cf.fieldName}) wajib diisi.`);
    }
  }

  const matGroups = ws.materialGroups || [];
  const matGroup = matGroups.find((mg) => mg.matkl === material.mara.matkl);
  if (!matGroup) {
    errors.push(
      `Material Group "${material.mara.matkl || '-'}" tidak terdaftar pada Master Material Group (T023 / CT04) tenant ini.`
    );
  } else {
    for (const ch of matGroup.characteristics) {
      if (!ch.required) continue;
      if (ch.dataType === 'boolean') continue;
      const val = material.characteristics?.[ch.charName];
      if (ch.dataType === 'number') {
        if (val === undefined || val === null || String(val).trim() === '' || Number.isNaN(Number(val))) {
          errors.push(
            `CT04 [${matGroup.matkl}]: Karakteristik wajib "${ch.label}" (${ch.charName}) harus diisi dengan angka.`
          );
        }
      } else if (val === undefined || val === null || String(val).trim() === '') {
        errors.push(
          `CT04 [${matGroup.matkl}]: Karakteristik wajib "${ch.label}" (${ch.charName}) wajib diisi.`
        );
      }
    }
  }

  return errors;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Bootstrap endpoint (tenant-aware)
  app.get('/api/bootstrap', (req, res) => {
    const db = loadDatabase();
    const { tenantId } = resolveTenantContext(db, req);
    if (db.activeTenantId !== tenantId) {
      db.activeTenantId = tenantId;
      saveDatabase(db);
    }
    res.json(buildBootstrapPayload(db, tenantId));
  });

  // Create New Tenant Company (OX02)
  app.post('/api/tenants', (req, res) => {
    const db = loadDatabase();
    const { bukrs, name, coreBusinessType, city } = req.body as {
      bukrs: string;
      name: string;
      coreBusinessType: TenantCoreBusinessType;
      city: string;
    };

    const cleanBukrs = (bukrs || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const cleanName = (name || '').trim();
    if (!cleanBukrs || cleanBukrs.length < 2) {
      return res.status(400).json({ error: 'Company Code (BUKRS) minimal 2 karakter alfanumerik.' });
    }
    if (!cleanName) {
      return res.status(400).json({ error: 'Nama perusahaan wajib diisi.' });
    }
    if (db.tenantCompanies.some((t) => t.bukrs === cleanBukrs)) {
      return res.status(409).json({ error: `Company Code ${cleanBukrs} sudah digunakan oleh tenant lain.` });
    }

    const coreMeta =
      CORE_BUSINESS_OPTIONS.find((o) => o.value === coreBusinessType) || CORE_BUSINESS_OPTIONS[4];
    const nextClientNum = String((db.tenantCompanies.length + 1) * 100);
    const tenantId = `tenant-${cleanBukrs.toLowerCase()}-${Date.now().toString(36)}`;

    const newCompany: TenantCompany = {
      tenantId,
      bukrs: cleanBukrs,
      clientNumber: nextClientNum,
      name: cleanName,
      shortName: `${cleanName.replace(/^PT\s+/i, '').split(' ').slice(0, 2).join(' ')}`,
      coreBusiness: coreMeta.label,
      coreBusinessType: coreMeta.value,
      city: (city || 'Jakarta').trim(),
      defaultIndustry: coreMeta.defaultIndustry,
      description: coreMeta.summary,
    };

    db.tenantCompanies.push(newCompany);
    db.workspaces[tenantId] = createTenantTemplateWorkspace(newCompany, coreMeta.value);
    db.activeTenantId = tenantId;
    saveDatabase(db);

    return res.status(201).json(buildBootstrapPayload(db, tenantId));
  });

  // Delete Tenant Company
  app.delete('/api/tenants/:tenantId', (req, res) => {
    const db = loadDatabase();
    const { tenantId } = req.params;
    if (db.tenantCompanies.length <= 1) {
      return res.status(400).json({ error: 'Minimal harus ada 1 perusahaan tenant aktif di sistem.' });
    }
    const idx = db.tenantCompanies.findIndex((t) => t.tenantId === tenantId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Tenant tidak ditemukan.' });
    }

    db.tenantCompanies.splice(idx, 1);
    delete db.workspaces[tenantId];
    if (db.activeTenantId === tenantId) {
      db.activeTenantId = db.tenantCompanies[0].tenantId;
    }
    saveDatabase(db);
    return res.json(buildBootstrapPayload(db, db.activeTenantId));
  });

  // Public reset endpoint permanently disabled to protect production database
  app.post('/api/reset', (_req, res) => {
    return res.status(403).json({
      error: 'Endpoint POST /api/reset dinonaktifkan demi keamanan data production.',
    });
  });

  // MM01 - Create Material Master (Internal Number Assignment MMNR)
  app.post('/api/materials', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const defaultWerks = workspace.plants[0]?.werks || '1000';
    const { material, activeWerks = defaultWerks, autoGenerateMaktx = false, username = 'SAP_USER' } = req.body as {
      material: MaterialMasterRecord;
      activeWerks?: string;
      autoGenerateMaktx?: boolean;
      username?: string;
    };

    // System-generated Material Number (Internal Number Range by MTART)
    material.mara.matnr = generateInternalMaterialNumber(
      material.mara.mtart,
      db.corporateMaraMaterials?.length ? db.corporateMaraMaterials : workspace.materials
    );
    normalizeCorporateMara(material);
    if (!material.characteristics) {
      material.characteristics = {};
    }

    const matGroup = (workspace.materialGroups || []).find((mg) => mg.matkl === material.mara.matkl);
    if (autoGenerateMaktx || !material.mara.maktx.trim()) {
      const generatedMaktx = buildMaterialShortDescription(matGroup, material.characteristics);
      if (generatedMaktx) {
        material.mara.maktx = generatedMaktx;
      }
    }

    const validationErrors = validateMaterialAgainstOms9(material, workspace, activeWerks);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0], details: validationErrors });
    }

    const now = new Date().toISOString();
    material.mara.createdAt = now;
    material.mara.updatedAt = now;
    material.mara.createdBy = username;

    syncCorporateMaterial(db, material);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MATERIAL',
      objectId: material.mara.matnr,
      tableName: 'MARA',
      fieldName: 'CREATE_MATERIAL (MM01)',
      oldValue: '-',
      newValue: `${material.mara.maktx} [${material.mara.mtart}/${material.mara.mbrsh}]`,
      username,
      timestamp: now,
    });

    saveDatabase(db);
    return res.status(201).json({ material, db: buildBootstrapPayload(db, tenantId) });
  });

  // MM01 Batch - Import Material Masters from XLS/XLSX
  app.post('/api/materials/import', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { rows, matkl: selectedMatkl, username = 'SAP_IMPORT' } = req.body as {
      rows: Record<string, unknown>[];
      matkl?: string;
      username?: string;
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada baris material untuk diimpor.' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ error: 'Maksimal 1.000 baris material per proses impor.' });
    }

    const created: string[] = [];
    const updated: string[] = [];
    const errors: Array<{ row: number; matnr?: string; errors: string[] }> = [];
    const now = new Date().toISOString();

    rows.forEach((rawRow, index) => {
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        row[String(key).trim().toUpperCase()] = value;
      }
      const rowNumber = index + 2;
      const matkl = String(row.MATKL || selectedMatkl || '').trim().toUpperCase();
      const maktx = String(row.MAKTX || '').trim();
      const meins = String(row.MEINS || '').trim().toUpperCase();
      const matnrInput = String(row.MATNR || '').trim();
      const mbrsh = String(row.MBRSH || 'M').trim().toUpperCase();
      const mtart = String(row.MTART || 'HAWA').trim().toUpperCase();
      const rowErrors: string[] = [];
      if (!maktx) rowErrors.push('MAKTX (deskripsi material) wajib diisi.');
      if (!matkl) rowErrors.push('MATKL (material group) wajib diisi.');
      if (!meins) rowErrors.push('MEINS (base unit) wajib diisi.');

      const matGroup = workspace.materialGroups.find((group) => group.matkl === matkl);
      if (!matGroup) rowErrors.push(`MATKL "${matkl}" tidak terdaftar.`);
      if (!workspace.unitsOfMeasure.some((unit) => unit.msehi === meins)) {
        rowErrors.push(`MEINS "${meins}" tidak terdaftar di master unit.`);
      }
      if (mbrsh !== 'M') rowErrors.push('MBRSH hanya dapat menggunakan M.');
      if (mtart !== 'HAWA') rowErrors.push('MTART hanya dapat menggunakan HAWA.');

      if (rowErrors.length === 0 && matGroup) {
        for (const char of matGroup.characteristics) {
          if (!char.required) continue;
          const value = row[char.charName.toUpperCase()] ?? row[char.label.toUpperCase()];
          if (value === undefined || value === null || String(value).trim() === '') {
            rowErrors.push(`Karakteristik wajib "${char.label}" (${char.charName}) belum diisi.`);
          }
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, matnr: matnrInput || undefined, errors: rowErrors });
        return;
      }

      const template = workspace.materials.find((material) => material.mara.matkl === matkl)
        || workspace.materials[0];
      if (!template) {
        errors.push({ row: rowNumber, matnr: matnrInput || undefined, errors: ['Data template material tenant tidak tersedia.'] });
        return;
      }

      const material = structuredClone(template);
      const matnr = matnrInput || generateInternalMaterialNumber(mtart as MaterialTypeCode, db.corporateMaraMaterials || workspace.materials);
      const oldMatnr = matnrInput ? matnrInput : undefined;
      material.mara = {
        ...material.mara,
        matnr,
        maktx,
        mtart: 'HAWA',
        mbrsh: 'M',
        meins,
        matkl,
        bismt: String(row.BISMT || row.LEGACY_CODE || '').trim(),
        createdAt: oldMatnr && workspace.materials.some((m) => m.mara.matnr === oldMatnr) ? material.mara.createdAt : now,
        createdBy: username,
        updatedAt: now,
      };

      material.characteristics = {};
      for (const char of matGroup?.characteristics || []) {
        const value = row[char.charName.toUpperCase()] ?? row[char.label.toUpperCase()];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          if (char.dataType === 'number') {
            material.characteristics[char.charName] = Number(value);
          } else if (char.dataType === 'boolean') {
            material.characteristics[char.charName] = ['true', '1', 'yes', 'ya'].includes(String(value).toLowerCase());
          } else {
            material.characteristics[char.charName] = String(value);
          }
        }
      }

      const validationErrors = validateMaterialAgainstOms9(material, workspace, workspace.plants[0]?.werks || '1000');
      if (validationErrors.length > 0) {
        errors.push({ row: rowNumber, matnr, errors: validationErrors });
        return;
      }

      const existed = workspace.materials.some((m) => m.mara.matnr === matnr);
      syncCorporateMaterial(db, material);
      workspace.changeDocuments.unshift({
        changenr: nextChangeNumber(workspace.changeDocuments),
        objectClass: 'MATERIAL',
        objectId: matnr,
        tableName: 'MARA',
        fieldName: existed ? 'IMPORT_UPDATE_MATERIAL (MM01/XLS)' : 'IMPORT_CREATE_MATERIAL (MM01/XLS)',
        oldValue: existed ? 'Existing' : '-',
        newValue: `${maktx} [HAWA/M]`,
        username,
        timestamp: now,
      });
      if (existed) updated.push(matnr);
      else created.push(matnr);
    });

    saveDatabase(db);
    return res.status(errors.length > 0 && created.length === 0 && updated.length === 0 ? 400 : 200).json({
      created,
      updated,
      errors,
      db: buildBootstrapPayload(db, tenantId),
    });
  });

  // MM02 - Update Material Master
  app.put('/api/materials/:matnr', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matnr } = req.params;
    const defaultWerks = workspace.plants[0]?.werks || '1000';
    const { material, activeWerks = defaultWerks, autoGenerateMaktx = false, username = 'SAP_USER' } = req.body as {
      material: MaterialMasterRecord;
      activeWerks?: string;
      autoGenerateMaktx?: boolean;
      username?: string;
    };

    const idx = workspace.materials.findIndex((m) => m.mara.matnr === matnr);
    if (idx === -1) {
      return res.status(404).json({ error: `Material ${matnr} tidak ditemukan di tenant aktif.` });
    }

    if (!material.characteristics) {
      material.characteristics = {};
    }
    normalizeCorporateMara(material);

    const targetGroup = (workspace.materialGroups || []).find((mg) => mg.matkl === material.mara.matkl);
    if (autoGenerateMaktx || !material.mara.maktx.trim()) {
      const generatedMaktx = buildMaterialShortDescription(targetGroup, material.characteristics);
      if (generatedMaktx) {
        material.mara.maktx = generatedMaktx;
      }
    }

    const validationErrors = validateMaterialAgainstOms9(material, workspace, activeWerks);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0], details: validationErrors });
    }

    const prev = workspace.materials[idx];
    const now = new Date().toISOString();
    material.mara.updatedAt = now;

    const diffs: ChangeDocument[] = [];
    const addDiff = (tableName: string, fieldName: string, oldVal: unknown, newVal: unknown) => {
      const o = String(oldVal ?? '');
      const n = String(newVal ?? '');
      if (o !== n) {
        diffs.push({
          changenr: nextChangeNumber([...diffs, ...workspace.changeDocuments]),
          objectClass: 'MATERIAL',
          objectId: matnr,
          tableName,
          fieldName,
          oldValue: o || '-',
          newValue: n || '-',
          username,
          timestamp: now,
        });
      }
    };

    addDiff('MARA', 'MAKTX (Description)', prev.mara.maktx, material.mara.maktx);
    addDiff('MARA', 'MBRSH (Industry Sector)', prev.mara.mbrsh, material.mara.mbrsh);
    addDiff('MARA', 'MATKL (Material Group)', prev.mara.matkl, material.mara.matkl);
    addDiff('MARA', 'MSTAE (X-Plant Status)', prev.mara.mstae || 'Active', material.mara.mstae || 'Active');
    addDiff('MARA', 'XCHPF (Batch Mgmt)', prev.mara.xchpf, material.mara.xchpf);

    const prevMarc = prev.marc[activeWerks];
    const nextMarc = material.marc[activeWerks];
    if (prevMarc && nextMarc) {
      addDiff('MARC', `DISMM [${activeWerks}] (MRP Type)`, prevMarc.dismm, nextMarc.dismm);
      addDiff('MARC', `MINBE [${activeWerks}] (Reorder Point)`, prevMarc.minbe, nextMarc.minbe);
      addDiff('MARC', `EKGRP [${activeWerks}] (Purch. Group)`, prevMarc.ekgrp, nextMarc.ekgrp);
    }

    const prevMbew = prev.mbew[activeWerks];
    const nextMbew = material.mbew[activeWerks];
    if (prevMbew && nextMbew) {
      addDiff('MBEW', `BWTTY [${activeWerks}] (Val. Category)`, prevMbew.bwtty || 'None', nextMbew.bwtty || 'None');
      addDiff('MBEW', `VPRSV [${activeWerks}] (Price Ctrl)`, prevMbew.vprsv, nextMbew.vprsv);
      addDiff('MBEW', `VERPR [${activeWerks}] (MAP)`, prevMbew.verpr, nextMbew.verpr);
      addDiff('MBEW', `STPRS [${activeWerks}] (Std Price)`, prevMbew.stprs, nextMbew.stprs);
    }

    for (const cf of workspace.customIndustryFields.filter((f) => f.industrySector === material.mara.mbrsh)) {
      addDiff('CI_MARA', cf.fieldName, prev.industryExtensions?.[cf.fieldName], material.industryExtensions?.[cf.fieldName]);
    }

    const matGroup = (workspace.materialGroups || []).find((mg) => mg.matkl === material.mara.matkl);
    if (matGroup) {
      for (const ch of matGroup.characteristics) {
        addDiff(
          'AUSP',
          `${matGroup.matkl} · ${ch.charName}`,
          prev.characteristics?.[ch.charName],
          material.characteristics?.[ch.charName]
        );
      }
    }

    if (diffs.length === 0) {
      diffs.push({
        changenr: nextChangeNumber(workspace.changeDocuments),
        objectClass: 'MATERIAL',
        objectId: matnr,
        tableName: 'MARA',
        fieldName: 'UPDATE_MATERIAL (MM02)',
        oldValue: 'Saved',
        newValue: 'Verified / Updated',
        username,
        timestamp: now,
      });
    }

    syncCorporateMaterial(db, material);
    workspace.changeDocuments.unshift(...diffs);
    saveDatabase(db);
    return res.json({ material, db: buildBootstrapPayload(db, tenantId) });
  });

  // Delete / Archive Material
  app.delete('/api/materials/:matnr', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matnr } = req.params;
    const idx = workspace.materials.findIndex((m) => m.mara.matnr === matnr);
    if (idx === -1) {
      return res.status(404).json({ error: `Material ${matnr} tidak ditemukan.` });
    }
    const openPos = workspace.purchaseOrders.filter((po) => po.matnr === matnr && po.status !== 'Completed');
    if (openPos.length > 0) {
      return res.status(400).json({
        error: `Material ${matnr} masih memiliki Purchase Order terbuka (${openPos[0].ebeln}). Tidak dapat dihapus.`,
      });
    }
    const totalStock = Object.values(workspace.materials[idx].mard).reduce(
      (sum, item) => sum + item.labst + item.insme + item.speme,
      0
    );
    if (totalStock > 0) {
      return res.status(400).json({
        error: `Material ${matnr} masih memiliki stok fisik (${totalStock}). Lakukan Goods Issue (MIGO 201) terlebih dahulu.`,
      });
    }
    for (const company of db.tenantCompanies) {
      const tenantWorkspace = db.workspaces[company.tenantId];
      if (!tenantWorkspace) continue;
      const openPo = tenantWorkspace.purchaseOrders.find(
        (po) => po.matnr === matnr && po.status !== 'Completed'
      );
      if (openPo) {
        return res.status(400).json({
          error: `Material ${matnr} masih memiliki Purchase Order terbuka di ${company.bukrs} (${openPo.ebeln}). Tidak dapat dihapus.`,
        });
      }
      const sharedMaterial = tenantWorkspace.materials.find((mat) => mat.mara.matnr === matnr);
      const tenantStock = Object.values(sharedMaterial?.mard || {}).reduce(
        (sum, item) => sum + item.labst + item.insme + item.speme,
        0
      );
      if (tenantStock > 0) {
        return res.status(400).json({
          error: `Material ${matnr} masih memiliki stok fisik di ${company.bukrs} (${tenantStock}). Tidak dapat dihapus.`,
        });
      }
    }
    removeCorporateMaterial(db, matnr);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MATERIAL',
      objectId: matnr,
      tableName: 'MARA',
      fieldName: 'DELETE_MATERIAL',
      oldValue: 'Active',
      newValue: 'Removed',
      username: 'SAP_USER',
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // ME51N - Create Purchase Requisition
  app.post('/api/mm/prs', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matnr, werks, lgort, menge, lfdat, bwtar, username = 'MRP_PLANNER' } = req.body as {
      matnr: string;
      werks: string;
      lgort: string;
      menge: number;
      lfdat: string;
      bwtar?: ValuationTypeCode;
      username?: string;
    };

    const material = workspace.materials.find((m) => m.mara.matnr === matnr);
    if (!material) return res.status(404).json({ error: 'Material tidak ditemukan.' });
    if (material.mara.mstae === '01' || material.mara.mstae === '02') {
      return res.status(400).json({
        error: `Material ${matnr} berstatus X-Plant Blocked (${material.mara.mstae}). Pengadaan diblokir.`,
      });
    }

    const marc = material.marc[werks] || Object.values(material.marc)[0];
    const mbew = material.mbew[werks] || Object.values(material.mbew)[0];
    const splitActive = Boolean(mbew?.bwtty);
    const chosenBwtar = splitActive ? bwtar || 'LOCAL' : undefined;
    const splitRow = chosenBwtar ? mbew?.splitValuations?.[chosenBwtar] : undefined;
    const suggestedPreis =
      chosenBwtar === 'FREE'
        ? 0
        : splitRow
        ? splitRow.vprsv === 'S'
          ? splitRow.stprs
          : splitRow.verpr
        : mbew?.vprsv === 'S'
        ? mbew.stprs
        : mbew?.verpr || 10000;

    const banfn = nextSequence(
      '001000',
      workspace.purchaseRequisitions.map((p) => p.banfn),
      4
    );

    const newPr: PurchaseRequisition = {
      banfn,
      matnr,
      maktx: material.mara.maktx,
      werks,
      lgort,
      menge: Number(menge),
      meins: material.mara.meins,
      lfdat,
      ekgrp: marc?.ekgrp || 'P01',
      dispo: marc?.dispo || 'M01',
      preis: suggestedPreis,
      waers: mbew?.waers || 'IDR',
      bwtar: chosenBwtar,
      status: 'Approved',
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    workspace.purchaseRequisitions.unshift(newPr);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MM_DOC',
      objectId: banfn,
      tableName: 'EBAN',
      fieldName: 'CREATE_PR (ME51N)',
      oldValue: '-',
      newValue: `${matnr} · ${menge} ${material.mara.meins} @ Plant ${werks}${chosenBwtar ? ` [${chosenBwtar}]` : ''}`,
      username,
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
    return res.status(201).json({ pr: newPr, db: buildBootstrapPayload(db, tenantId) });
  });

  // Convert PR to PO
  app.post('/api/mm/prs/:banfn/convert', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { banfn } = req.params;
    const { lifnr, netpr, eindt, bwtar, username = 'BUYER_MM' } = req.body as {
      lifnr: string;
      netpr?: number;
      eindt?: string;
      bwtar?: ValuationTypeCode;
      username?: string;
    };

    const pr = workspace.purchaseRequisitions.find((p) => p.banfn === banfn);
    if (!pr) return res.status(404).json({ error: `PR ${banfn} tidak ditemukan.` });
    if (pr.status === 'Converted to PO') {
      return res.status(400).json({ error: `PR ${banfn} sudah dikonversi menjadi PO ${pr.ebeln}.` });
    }

    const vendor = workspace.vendors.find((v) => v.lifnr === lifnr);
    if (!vendor) return res.status(404).json({ error: 'Vendor tidak ditemukan.' });

    const ebeln = nextSequence(
      '450000',
      workspace.purchaseOrders.map((o) => o.ebeln),
      4
    );

    const resolvedBwtar = bwtar || pr.bwtar;
    const newPo: PurchaseOrder = {
      ebeln,
      lifnr: vendor.lifnr,
      vendorName: vendor.name,
      matnr: pr.matnr,
      maktx: pr.maktx,
      werks: pr.werks,
      lgort: pr.lgort,
      menge: pr.menge,
      receivedQty: 0,
      meins: pr.meins,
      netpr: resolvedBwtar === 'FREE' ? 0 : netpr !== undefined ? Number(netpr) : pr.preis,
      peinh: 1,
      waers: pr.waers,
      bwtar: resolvedBwtar,
      ekgrp: pr.ekgrp,
      eindt: eindt || pr.lfdat,
      status: 'Open',
      banfn: pr.banfn,
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    pr.status = 'Converted to PO';
    pr.ebeln = ebeln;
    workspace.purchaseOrders.unshift(newPo);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MM_DOC',
      objectId: ebeln,
      tableName: 'EKKO / EKPO',
      fieldName: 'CONVERT_PR_TO_PO',
      oldValue: `PR ${banfn}`,
      newValue: `PO ${ebeln} (${vendor.name})`,
      username,
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
    return res.status(201).json({ po: newPo, db: buildBootstrapPayload(db, tenantId) });
  });

  // ME21N - Create Purchase Order directly
  app.post('/api/mm/pos', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { lifnr, matnr, werks, lgort, menge, netpr, eindt, bwtar, username = 'BUYER_MM' } = req.body as {
      lifnr: string;
      matnr: string;
      werks: string;
      lgort: string;
      menge: number;
      netpr: number;
      eindt: string;
      bwtar?: ValuationTypeCode;
      username?: string;
    };

    const material = workspace.materials.find((m) => m.mara.matnr === matnr);
    if (!material) return res.status(404).json({ error: 'Material tidak ditemukan.' });
    if (material.mara.mstae === '01' || material.mara.mstae === '02') {
      return res.status(400).json({
        error: `Material ${matnr} berstatus Blocked (${material.mara.mstae}). Tidak dapat membuat Purchase Order.`,
      });
    }

    const vendor = workspace.vendors.find((v) => v.lifnr === lifnr);
    if (!vendor) return res.status(404).json({ error: 'Vendor tidak ditemukan.' });

    const marc = material.marc[werks] || Object.values(material.marc)[0];
    const mbew = material.mbew[werks] || Object.values(material.mbew)[0];
    const splitActive = Boolean(mbew?.bwtty);
    const resolvedBwtar = splitActive ? bwtar || 'LOCAL' : undefined;

    const ebeln = nextSequence(
      '450000',
      workspace.purchaseOrders.map((o) => o.ebeln),
      4
    );

    const newPo: PurchaseOrder = {
      ebeln,
      lifnr: vendor.lifnr,
      vendorName: vendor.name,
      matnr,
      maktx: material.mara.maktx,
      werks,
      lgort,
      menge: Number(menge),
      receivedQty: 0,
      meins: material.mara.meins,
      netpr: resolvedBwtar === 'FREE' ? 0 : Number(netpr),
      peinh: mbew?.peinh || 1,
      waers: mbew?.waers || 'IDR',
      bwtar: resolvedBwtar,
      ekgrp: marc?.ekgrp || 'P01',
      eindt,
      status: 'Open',
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    workspace.purchaseOrders.unshift(newPo);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MM_DOC',
      objectId: ebeln,
      tableName: 'EKKO / EKPO',
      fieldName: 'CREATE_PO (ME21N)',
      oldValue: '-',
      newValue: `${matnr} · ${menge} ${material.mara.meins} @ ${newPo.netpr}${resolvedBwtar ? ` [${resolvedBwtar}]` : ''}`,
      username,
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
    return res.status(201).json({ po: newPo, db: buildBootstrapPayload(db, tenantId) });
  });

  // MIGO - Goods Movement (101 GR, 201 GI, 311 Transfer, 561 Initial)
  app.post('/api/mm/migo', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const {
      bwart,
      matnr,
      werks,
      lgort,
      targetLgort,
      ebeln,
      kostl,
      menge,
      bwtar,
      bktxt = '',
      username = 'WH_OPERATOR',
    } = req.body as {
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
      username?: string;
    };

    const qty = Number(menge);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Quantity pergerakan barang harus lebih besar dari 0.' });
    }

    const material = workspace.materials.find((m) => m.mara.matnr === matnr);
    if (!material) return res.status(404).json({ error: `Material ${matnr} tidak ditemukan.` });

    if (material.mara.mstae === '02') {
      return res.status(400).json({ error: `Material ${matnr} diblokir total (MSTAE=02).` });
    }

    const plantDef = workspace.plants.find((p) => p.werks === werks);
    const slocDef = plantDef?.storageLocations.find((s) => s.lgort === lgort);
    const mardKey = `${werks}-${lgort}`;

    const ensureMard = (w: string, l: string) => {
      const k = `${w}-${l}`;
      if (!material.mard[k]) {
        const sDef = workspace.plants.find((p) => p.werks === w)?.storageLocations.find((s) => s.lgort === l);
        material.mard[k] = {
          werks: w,
          lgort: l,
          lgobe: sDef?.lgobe || `Storage ${l}`,
          lgpbe: `BIN-${l}-01`,
          labst: 0,
          insme: 0,
          speme: 0,
          raube: '01 - Normal Indoor',
          tempb: 'Ambient',
          maxlz: 365,
          mhdrz: 0,
          mhdhb: 365,
        };
      }
      return material.mard[k];
    };

    if (!material.mbew[werks]) {
      const fallbackMbew = Object.values(material.mbew)[0];
      material.mbew[werks] = {
        bwkey: werks,
        bwtty: fallbackMbew?.bwtty || '',
        bklas: fallbackMbew?.bklas || '3000',
        vprsv: fallbackMbew?.vprsv || 'V',
        verpr: fallbackMbew?.verpr || 10000,
        stprs: fallbackMbew?.stprs || 10000,
        peinh: fallbackMbew?.peinh || 1,
        waers: fallbackMbew?.waers || 'IDR',
        lbkum: 0,
        salk3: 0,
      };
    }

    const mbew = material.mbew[werks];
    const isSplitActive = Boolean(mbew.bwtty);
    let activeBwtar: ValuationTypeCode | undefined = undefined;

    const ensureSplitRow = (vt: ValuationTypeCode): SplitValuationItem => {
      if (!mbew.splitValuations) mbew.splitValuations = {};
      if (!mbew.splitValuations[vt]) {
        mbew.splitValuations[vt] = {
          bwtar: vt,
          bklas: mbew.bklas,
          vprsv: mbew.vprsv,
          verpr: vt === 'FREE' ? 0 : mbew.verpr,
          stprs: vt === 'FREE' ? 0 : mbew.stprs,
          peinh: mbew.peinh,
          lbkum: 0,
          salk3: 0,
        };
      }
      return mbew.splitValuations[vt]!;
    };

    const recomputeHeaderFromSplits = () => {
      if (!mbew.splitValuations) return;
      const items = Object.values(mbew.splitValuations).filter((x): x is SplitValuationItem => Boolean(x));
      const totalQty = items.reduce((s, x) => s + x.lbkum, 0);
      const totalVal = items.reduce((s, x) => s + x.salk3, 0);
      mbew.lbkum = totalQty;
      mbew.salk3 = totalVal;
      if (totalQty > 0) {
        mbew.verpr = Math.round((totalVal / totalQty) * mbew.peinh);
      }
    };

    let unitPrice = mbew.vprsv === 'V' ? mbew.verpr : mbew.stprs;
    let dmbtr = 0;
    let bwartDesc = '';
    const oldStock = material.mard[mardKey]?.labst || 0;

    if (bwart === '101') {
      bwartDesc = 'Goods Receipt for Purchase Order';
      if (!ebeln) return res.status(400).json({ error: 'Nomor Purchase Order (EBELN) wajib untuk MIGO 101.' });
      const po = workspace.purchaseOrders.find((o) => o.ebeln === ebeln);
      if (!po) return res.status(404).json({ error: `PO ${ebeln} tidak ditemukan.` });
      const remaining = po.menge - po.receivedQty;
      if (qty > remaining) {
        return res.status(400).json({
          error: `Qty GR (${qty}) melebihi sisa Open Qty PO (${remaining} ${po.meins}).`,
        });
      }

      if (isSplitActive) {
        activeBwtar = bwtar || po.bwtar || 'LOCAL';
      }

      unitPrice = activeBwtar === 'FREE' ? 0 : po.netpr / (po.peinh || 1);
      dmbtr = Math.round(qty * unitPrice);

      const mard = ensureMard(werks, lgort);
      mard.labst += qty;

      if (isSplitActive && activeBwtar) {
        const splitRow = ensureSplitRow(activeBwtar);
        const newSplitQty = splitRow.lbkum + qty;
        if (splitRow.vprsv === 'V') {
          const newSplitVal = splitRow.salk3 + dmbtr;
          splitRow.verpr =
            activeBwtar === 'FREE'
              ? 0
              : newSplitQty > 0
              ? Math.round((newSplitVal / newSplitQty) * splitRow.peinh)
              : unitPrice;
          splitRow.lbkum = newSplitQty;
          splitRow.salk3 = newSplitVal;
        } else {
          splitRow.lbkum = newSplitQty;
          splitRow.salk3 = Math.round((newSplitQty * splitRow.stprs) / splitRow.peinh);
        }
        recomputeHeaderFromSplits();
      } else {
        const newLbkum = mbew.lbkum + qty;
        if (mbew.vprsv === 'V') {
          const newSalk3 = mbew.salk3 + dmbtr;
          mbew.verpr = newLbkum > 0 ? Math.round((newSalk3 / newLbkum) * mbew.peinh) : unitPrice;
          mbew.lbkum = newLbkum;
          mbew.salk3 = newSalk3;
        } else {
          mbew.lbkum = newLbkum;
          mbew.salk3 = Math.round((newLbkum * mbew.stprs) / mbew.peinh);
        }
      }

      po.receivedQty += qty;
      po.status = po.receivedQty >= po.menge ? 'Completed' : 'Partially Received';
    } else if (bwart === '201') {
      bwartDesc = 'Goods Issue for Cost Center';
      const mard = material.mard[mardKey];
      if (!mard || mard.labst < qty) {
        return res.status(400).json({
          error: `Stok Unrestricted di ${werks}/${lgort} (${mard?.labst || 0}) tidak mencukupi untuk Goods Issue ${qty}.`,
        });
      }

      if (isSplitActive) {
        activeBwtar = bwtar || 'LOCAL';
        const splitRow = ensureSplitRow(activeBwtar);
        if (splitRow.lbkum < qty) {
          return res.status(400).json({
            error: `Stok Valuation Type ${activeBwtar} di Plant ${werks} (${splitRow.lbkum} ${material.mara.meins}) tidak mencukupi untuk GI ${qty}.`,
          });
        }
        const splitUnit = activeBwtar === 'FREE' ? 0 : splitRow.vprsv === 'V' ? splitRow.verpr : splitRow.stprs;
        dmbtr = Math.round((qty * splitUnit) / (splitRow.peinh || 1));
        splitRow.lbkum -= qty;
        splitRow.salk3 = Math.max(0, splitRow.salk3 - dmbtr);
        mard.labst -= qty;
        recomputeHeaderFromSplits();
      } else {
        dmbtr = Math.round((qty * unitPrice) / (mbew.peinh || 1));
        mard.labst -= qty;
        mbew.lbkum = Math.max(0, mbew.lbkum - qty);
        mbew.salk3 = Math.max(0, mbew.salk3 - dmbtr);
      }
    } else if (bwart === '311') {
      bwartDesc = 'Transfer Posting Storage Location';
      if (!targetLgort || targetLgort === lgort) {
        return res.status(400).json({ error: 'Storage Location tujuan (Target SLoc) harus berbeda dari asal.' });
      }
      const sourceMard = material.mard[mardKey];
      if (!sourceMard || sourceMard.labst < qty) {
        return res.status(400).json({
          error: `Stok Unrestricted di ${werks}/${lgort} (${sourceMard?.labst || 0}) tidak mencukupi untuk transfer.`,
        });
      }
      if (isSplitActive) activeBwtar = bwtar || 'LOCAL';
      const targetMard = ensureMard(werks, targetLgort);
      sourceMard.labst -= qty;
      targetMard.labst += qty;
      dmbtr = activeBwtar === 'FREE' ? 0 : Math.round((qty * unitPrice) / (mbew.peinh || 1));
    } else if (bwart === '561') {
      bwartDesc = 'Initial Entry of Stock Balances';
      const mard = ensureMard(werks, lgort);
      mard.labst += qty;
      if (isSplitActive) {
        activeBwtar = bwtar || 'LOCAL';
        const splitRow = ensureSplitRow(activeBwtar);
        const splitUnit = activeBwtar === 'FREE' ? 0 : splitRow.vprsv === 'V' ? splitRow.verpr : splitRow.stprs;
        dmbtr = Math.round((qty * splitUnit) / (splitRow.peinh || 1));
        splitRow.lbkum += qty;
        splitRow.salk3 += dmbtr;
        recomputeHeaderFromSplits();
      } else {
        dmbtr = Math.round((qty * unitPrice) / (mbew.peinh || 1));
        mbew.lbkum += qty;
        mbew.salk3 += dmbtr;
      }
    }

    const mblnr = nextSequence(
      '50000',
      workspace.materialDocuments.map((d) => d.mblnr),
      5
    );
    const belnr = nextSequence(
      '49000',
      workspace.materialDocuments.map((d) => d.belnr),
      5
    );

    const doc: MaterialDocument = {
      mblnr,
      mjahr: '2026',
      bwart,
      bwartDesc,
      matnr,
      maktx: material.mara.maktx,
      werks,
      lgort,
      targetLgort,
      ebeln,
      kostl,
      menge: qty,
      meins: material.mara.meins,
      dmbtr,
      waers: mbew.waers,
      bwtar: activeBwtar,
      belnr,
      budat: new Date().toISOString().slice(0, 10),
      usnam: username,
      bktxt: bktxt || `${bwartDesc} (${slocDef?.lgobe || lgort})`,
    };

    const newStock = material.mard[mardKey]?.labst || 0;
    workspace.materialDocuments.unshift(doc);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'MM_DOC',
      objectId: mblnr,
      tableName: 'MARD / MBEW',
      fieldName: `MIGO ${bwart} (${werks}/${lgort}${activeBwtar ? ` · ${activeBwtar}` : ''})`,
      oldValue: `${oldStock} ${material.mara.meins}`,
      newValue: `${newStock} ${material.mara.meins} · MAP ${mbew.verpr.toLocaleString('id-ID')} ${mbew.waers}`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.status(201).json({ doc, db: buildBootstrapPayload(db, tenantId) });
  });

  // OMS9 - Update Standard Field Rules
  app.put('/api/customizing/standard-rules', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { rules, username = 'BASIS_ADMIN' } = req.body as {
      rules: StandardFieldRule[];
      username?: string;
    };

    workspace.standardFieldRules = rules;
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: 'OMS9',
      tableName: 'T137 / T130F',
      fieldName: 'FIELD_SELECTION_MATRIX',
      oldValue: 'Previous Matrix',
      newValue: 'Updated OMS9 Rules',
      username,
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // Add Custom Industry Append Field (CI_MARA)
  app.post('/api/customizing/industry-fields', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { field, username = 'BASIS_ADMIN' } = req.body as {
      field: CustomIndustryField;
      username?: string;
    };

    const normalizedName = field.fieldName.toUpperCase().startsWith('ZZ_')
      ? field.fieldName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : `ZZ_${field.fieldName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;

    const targetSector = INDUSTRY_SECTORS[0].mbrsh;
    if (
      workspace.customIndustryFields.some(
        (f) => f.fieldName === normalizedName && f.industrySector === targetSector
      )
    ) {
      return res.status(409).json({
        error: `Field ${normalizedName} sudah ada di struktur CI_MARA tenant ini untuk sektor ${targetSector}.`,
      });
    }

    const newField: CustomIndustryField = {
      ...field,
      industrySector: targetSector,
      id: `cf-${Date.now()}`,
      fieldName: normalizedName,
    };

    workspace.customIndustryFields.push(newField);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: `CI_MARA-${newField.industrySector}`,
      tableName: 'CI_MARA',
      fieldName: `ADD ${newField.fieldName}`,
      oldValue: '-',
      newValue: `${newField.label} (${newField.status})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.status(201).json({ field: newField, db: buildBootstrapPayload(db, tenantId) });
  });

  // Update Custom Industry Append Field
  app.put('/api/customizing/industry-fields/:id', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { id } = req.params;
    const { field, username = 'BASIS_ADMIN' } = req.body as {
      field: CustomIndustryField;
      username?: string;
    };

    const idx = workspace.customIndustryFields.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Custom field tidak ditemukan.' });

    const prev = workspace.customIndustryFields[idx];
    const normalizedField: CustomIndustryField = {
      ...field,
      industrySector: INDUSTRY_SECTORS[0].mbrsh,
    };
    workspace.customIndustryFields[idx] = normalizedField;
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: `CI_MARA-${normalizedField.industrySector}`,
      tableName: 'CI_MARA',
      fieldName: field.fieldName,
      oldValue: `${prev.label} (${prev.status})`,
      newValue: `${field.label} (${field.status})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // Delete Custom Industry Append Field
  app.delete('/api/customizing/industry-fields/:id', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { id } = req.params;
    const idx = workspace.customIndustryFields.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Custom field tidak ditemukan.' });

    const removed = workspace.customIndustryFields[idx];
    workspace.customIndustryFields.splice(idx, 1);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: `CI_MARA-${removed.industrySector}`,
      tableName: 'CI_MARA',
      fieldName: `DROP ${removed.fieldName}`,
      oldValue: removed.label,
      newValue: 'Removed',
      username: 'BASIS_ADMIN',
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // CT04 / T023 - Create Material Group
  app.post('/api/customizing/material-groups', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { group, username = 'BASIS_ADMIN' } = req.body as {
      group: {
        matkl: string;
        label: string;
        defaultMtart?: MaterialTypeCode;
        defaultBklas?: string;
        description?: string;
      };
      username?: string;
    };

    const cleanMatkl = (group?.matkl || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '-');
    const cleanLabel = (group?.label || '').trim();
    if (!cleanMatkl || !cleanLabel) {
      return res.status(400).json({ error: 'Kode Material Group (MATKL) dan Label wajib diisi.' });
    }
    if (!workspace.materialGroups) workspace.materialGroups = [];
    if (workspace.materialGroups.some((mg) => mg.matkl === cleanMatkl)) {
      return res.status(409).json({ error: `Material Group ${cleanMatkl} sudah terdaftar di tenant ini.` });
    }

    const newGroup: MaterialGroupDefinition = {
      matkl: cleanMatkl,
      label: cleanLabel,
      defaultMtart: group.defaultMtart || 'HAWA',
      defaultBklas: group.defaultBklas?.trim() || '3100',
      description: (group.description || cleanLabel).trim(),
      characteristics: [],
    };

    workspace.materialGroups.push(newGroup);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: cleanMatkl,
      tableName: 'T023',
      fieldName: 'CREATE_MATKL',
      oldValue: '-',
      newValue: `${cleanMatkl} · ${cleanLabel} (ValClass ${newGroup.defaultBklas})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.status(201).json({ materialGroup: newGroup, db: buildBootstrapPayload(db, tenantId) });
  });

  // T023 - Update Material Group
  app.put('/api/customizing/material-groups/:matkl', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl } = req.params;
    const { group, username = 'BASIS_ADMIN' } = req.body as {
      group: {
        label: string;
        defaultMtart?: MaterialTypeCode;
        defaultBklas?: string;
        description?: string;
      };
      username?: string;
    };

    const existing = (workspace.materialGroups || []).find((mg) => mg.matkl === matkl);
    if (!existing) return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });

    const cleanLabel = (group?.label || '').trim();
    if (!cleanLabel) {
      return res.status(400).json({ error: 'Nama Material Group wajib diisi.' });
    }

    const prevLabel = existing.label;
    existing.label = cleanLabel;
    existing.defaultMtart = group.defaultMtart || existing.defaultMtart || 'HAWA';
    if (group.defaultBklas !== undefined && group.defaultBklas.trim()) {
      existing.defaultBklas = group.defaultBklas.trim();
    }
    existing.description = (group.description ?? cleanLabel).trim();

    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'T023',
      fieldName: 'UPDATE_MATKL',
      oldValue: prevLabel,
      newValue: `${existing.label} (${existing.defaultMtart}${existing.defaultBklas ? ` · ValClass ${existing.defaultBklas}` : ''})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ materialGroup: existing, db: buildBootstrapPayload(db, tenantId) });
  });

  // T023 - Delete Material Group (blocked if referenced by materials in MARA)
  app.delete('/api/customizing/material-groups/:matkl', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl } = req.params;

    if (!workspace.materialGroups) workspace.materialGroups = [];
    const idx = workspace.materialGroups.findIndex((mg) => mg.matkl === matkl);
    if (idx === -1) return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });

    const usedBy = workspace.materials.filter((m) => m.mara.matkl === matkl);
    if (usedBy.length > 0) {
      return res.status(400).json({
        error: `Material Group ${matkl} sedang digunakan oleh ${usedBy.length} material (mis. ${usedBy[0].mara.matnr}). Tidak dapat dihapus.`,
      });
    }

    const removed = workspace.materialGroups.splice(idx, 1)[0];
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'T023',
      fieldName: 'DROP_MATKL',
      oldValue: `${removed.matkl} · ${removed.label}`,
      newValue: 'Removed',
      username: 'BASIS_ADMIN',
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // T006 / CUNI - Create Base Unit of Measure
  app.post('/api/customizing/uoms', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { uom, username = 'BASIS_ADMIN' } = req.body as {
      uom: {
        msehi: string;
        label: string;
        isoCode?: string;
        dimension?: UomDimension;
        decimalPlaces?: number;
        description?: string;
      };
      username?: string;
    };

    const cleanMsehi = (uom?.msehi || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const cleanLabel = (uom?.label || '').trim();
    if (!cleanMsehi || !cleanLabel) {
      return res.status(400).json({ error: 'Kode UoM (MSEHI) dan Nama Satuan wajib diisi.' });
    }
    if (!workspace.unitsOfMeasure) workspace.unitsOfMeasure = [];
    if (workspace.unitsOfMeasure.some((u) => u.msehi === cleanMsehi)) {
      return res.status(409).json({ error: `Satuan ${cleanMsehi} sudah terdaftar di Master UoM (T006) tenant ini.` });
    }

    const parsedDec = Number.isFinite(Number(uom.decimalPlaces))
      ? Math.max(0, Math.min(3, Math.trunc(Number(uom.decimalPlaces))))
      : 0;

    const newUom: UnitOfMeasureDefinition = {
      msehi: cleanMsehi,
      label: cleanLabel,
      isoCode: (uom.isoCode || cleanMsehi).trim().toUpperCase().slice(0, 6),
      dimension: uom.dimension || 'Count',
      decimalPlaces: parsedDec,
      description: (uom.description || cleanLabel).trim(),
    };

    workspace.unitsOfMeasure.push(newUom);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: cleanMsehi,
      tableName: 'T006 / CUNI',
      fieldName: 'CREATE_UOM',
      oldValue: '-',
      newValue: `${newUom.msehi} · ${newUom.label} (${newUom.dimension}, dec ${newUom.decimalPlaces})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.status(201).json({ uom: newUom, db: buildBootstrapPayload(db, tenantId) });
  });

  // T006 / CUNI - Update Base Unit of Measure
  app.put('/api/customizing/uoms/:msehi', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { msehi } = req.params;
    const { uom, username = 'BASIS_ADMIN' } = req.body as {
      uom: Partial<UnitOfMeasureDefinition>;
      username?: string;
    };

    if (!workspace.unitsOfMeasure) workspace.unitsOfMeasure = [];
    const existing = workspace.unitsOfMeasure.find((u) => u.msehi === msehi);
    if (!existing) return res.status(404).json({ error: `Satuan ${msehi} tidak ditemukan.` });

    const prevSummary = `${existing.label} (${existing.dimension}, dec ${existing.decimalPlaces})`;
    if (uom.label !== undefined && uom.label.trim()) existing.label = uom.label.trim();
    if (uom.isoCode !== undefined && uom.isoCode.trim()) {
      existing.isoCode = uom.isoCode.trim().toUpperCase().slice(0, 6);
    }
    if (uom.dimension !== undefined) existing.dimension = uom.dimension;
    if (uom.decimalPlaces !== undefined && Number.isFinite(Number(uom.decimalPlaces))) {
      existing.decimalPlaces = Math.max(0, Math.min(3, Math.trunc(Number(uom.decimalPlaces))));
    }
    if (uom.description !== undefined) existing.description = uom.description.trim();

    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: msehi,
      tableName: 'T006 / CUNI',
      fieldName: 'UPDATE_UOM',
      oldValue: prevSummary,
      newValue: `${existing.label} (${existing.dimension}, dec ${existing.decimalPlaces})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ uom: existing, db: buildBootstrapPayload(db, tenantId) });
  });

  // T006 / CUNI - Delete Base Unit of Measure (blocked if used by materials in MARA)
  app.delete('/api/customizing/uoms/:msehi', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { msehi } = req.params;

    if (!workspace.unitsOfMeasure) workspace.unitsOfMeasure = [];
    const idx = workspace.unitsOfMeasure.findIndex((u) => u.msehi === msehi);
    if (idx === -1) return res.status(404).json({ error: `Satuan ${msehi} tidak ditemukan.` });

    const usedBy = workspace.materials.filter((m) => m.mara.meins === msehi);
    if (usedBy.length > 0) {
      return res.status(400).json({
        error: `Satuan ${msehi} sedang dipakai oleh ${usedBy.length} material (mis. ${usedBy[0].mara.matnr}). Tidak dapat dihapus.`,
      });
    }

    const removed = workspace.unitsOfMeasure.splice(idx, 1)[0];
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: msehi,
      tableName: 'T006 / CUNI',
      fieldName: 'DROP_UOM',
      oldValue: `${removed.msehi} · ${removed.label}`,
      newValue: 'Removed',
      username: 'BASIS_ADMIN',
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // CT04 - Add Master Characteristic to a Material Group
  app.post('/api/customizing/material-groups/:matkl/characteristics', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl } = req.params;
    const { characteristic, username = 'BASIS_ADMIN' } = req.body as {
      characteristic: MasterCharacteristic;
      username?: string;
    };

    if (!workspace.materialGroups) workspace.materialGroups = [];
    const group = workspace.materialGroups.find((mg) => mg.matkl === matkl);
    if (!group) {
      return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });
    }

    const rawName = (characteristic?.charName || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const normalizedCharName = rawName.startsWith('CHR_') ? rawName : `CHR_${rawName}`;
    if (!rawName || !characteristic?.label?.trim()) {
      return res.status(400).json({ error: 'Technical Characteristic Name (CHR_*) dan Label wajib diisi.' });
    }

    if (group.characteristics.some((c) => c.charName === normalizedCharName)) {
      return res.status(409).json({
        error: `Karakteristik ${normalizedCharName} sudah terdaftar pada Material Group ${matkl}.`,
      });
    }

    const newChar: MasterCharacteristic = {
      id: `ch-${Date.now()}`,
      charName: normalizedCharName,
      label: characteristic.label.trim(),
      dataType: characteristic.dataType || 'text',
      unit: characteristic.unit?.trim() || undefined,
      options:
        characteristic.dataType === 'select' && characteristic.options
          ? characteristic.options.map((o) => o.trim()).filter(Boolean)
          : undefined,
      required: Boolean(characteristic.required),
      helpText: characteristic.helpText?.trim() || `Karakteristik master untuk ${group.label}`,
    };

    group.characteristics.push(newChar);
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'CT04 / CABN',
      fieldName: `ADD ${newChar.charName}`,
      oldValue: '-',
      newValue: `${newChar.label} (${newChar.required ? 'Wajib' : 'Opsional'})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.status(201).json({ characteristic: newChar, db: buildBootstrapPayload(db, tenantId) });
  });

  // CT04 - Update Master Characteristic
  app.put('/api/customizing/material-groups/:matkl/characteristics/:charId', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl, charId } = req.params;
    const { characteristic, username = 'BASIS_ADMIN' } = req.body as {
      characteristic: MasterCharacteristic;
      username?: string;
    };

    const group = (workspace.materialGroups || []).find((mg) => mg.matkl === matkl);
    if (!group) return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });

    const idx = group.characteristics.findIndex((c) => c.id === charId);
    if (idx === -1) return res.status(404).json({ error: 'Master Characteristic tidak ditemukan.' });

    const prev = group.characteristics[idx];
    group.characteristics[idx] = { ...prev, ...characteristic, id: prev.id, charName: prev.charName };
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'CT04 / CABN',
      fieldName: prev.charName,
      oldValue: `${prev.label} (${prev.required ? 'Wajib' : 'Opsional'})`,
      newValue: `${group.characteristics[idx].label} (${group.characteristics[idx].required ? 'Wajib' : 'Opsional'})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // CT04 - Reorder Master Characteristics (determines MARA-MAKTX Short Description sequence)
  app.put('/api/customizing/material-groups/:matkl/reorder', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl } = req.params;
    const { charIds, username = 'BASIS_ADMIN' } = req.body as {
      charIds: string[];
      username?: string;
    };

    const group = (workspace.materialGroups || []).find((mg) => mg.matkl === matkl);
    if (!group) return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });

    const prevPattern = group.characteristics.map((c) => c.label).join('-');
    const byId = new Map(group.characteristics.map((c) => [c.id, c]));
    const reordered: MasterCharacteristic[] = [];
    for (const id of charIds || []) {
      const item = byId.get(id);
      if (item) {
        reordered.push(item);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      reordered.push(remaining);
    }

    group.characteristics = reordered;
    const nextPattern = group.characteristics.map((c) => c.label).join('-');

    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'CT04 / CABN',
      fieldName: 'REORDER_SHORT_DESC_FORMAT',
      oldValue: prevPattern || '-',
      newValue: nextPattern || '-',
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  // CT04 - Delete Master Characteristic
  app.delete('/api/customizing/material-groups/:matkl/characteristics/:charId', (req, res) => {
    const db = loadDatabase();
    const { tenantId, workspace } = resolveTenantContext(db, req);
    const { matkl, charId } = req.params;

    const group = (workspace.materialGroups || []).find((mg) => mg.matkl === matkl);
    if (!group) return res.status(404).json({ error: `Material Group ${matkl} tidak ditemukan.` });

    const idx = group.characteristics.findIndex((c) => c.id === charId);
    if (idx === -1) return res.status(404).json({ error: 'Master Characteristic tidak ditemukan.' });

    const removed = group.characteristics.splice(idx, 1)[0];
    workspace.changeDocuments.unshift({
      changenr: nextChangeNumber(workspace.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: matkl,
      tableName: 'CT04 / CABN',
      fieldName: `DROP ${removed.charName}`,
      oldValue: removed.label,
      newValue: 'Removed',
      username: 'BASIS_ADMIN',
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db: buildBootstrapPayload(db, tenantId) });
  });

  app.use('/api', (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan internal pada server.';
    console.error('[SAP SERVER ERROR]', err);
    if (res.headersSent) return;
    res.status(500).json({ error: message });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAP S/4HANA Multi-Tenant Material Master & MM server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
