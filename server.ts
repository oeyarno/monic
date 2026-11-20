import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  CORE_BUSINESS_OPTIONS, createInitialMultiTenantDatabase, createTenantTemplateWorkspace,
  INDUSTRY_SECTORS, MATERIAL_TYPES, VALUATION_TYPES,
} from './server/seedData.ts';
import type {
  ChangeDocument,
  CustomIndustryField,
  MaterialDocument,
  MaterialMasterRecord,
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
  ValuationTypeCode,
} from './src/types/sap.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sap-store.json');

type TenantDatabaseContext = { database: MultiTenantDatabase; tenantId: string };
const databaseContexts = new WeakMap<object, TenantDatabaseContext>();
function saveMultiTenantDatabase(db: MultiTenantDatabase): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}
function loadMultiTenantDatabase(): MultiTenantDatabase {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) { const initial = createInitialMultiTenantDatabase(); saveMultiTenantDatabase(initial); return initial; }
  let parsed: any;
  try { parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch { throw new Error('Database MONIC tidak dapat dibaca. Data tidak diubah; perlu pemulihan manual.'); }
  if (parsed && parsed.schemaVersion >= 2 && Array.isArray(parsed.tenantCompanies) && parsed.workspaces && typeof parsed.workspaces === 'object') return parsed as MultiTenantDatabase;
  if (parsed && Array.isArray(parsed.materials)) {
    const migrated = createInitialMultiTenantDatabase(), firstTenant = migrated.tenantCompanies[0];
    const legacy = parsed as Partial<TenantWorkspaceData>;
    migrated.workspaces[firstTenant.tenantId] = {
      materials: legacy.materials || [], purchaseRequisitions: legacy.purchaseRequisitions || [],
      purchaseOrders: legacy.purchaseOrders || [], materialDocuments: legacy.materialDocuments || [],
      customIndustryFields: legacy.customIndustryFields || [], standardFieldRules: legacy.standardFieldRules || [],
      changeDocuments: legacy.changeDocuments || [], plants: legacy.plants || [], vendors: legacy.vendors || [],
    };
    migrated.activeTenantId = firstTenant.tenantId; saveMultiTenantDatabase(migrated); return migrated;
  }
  throw new Error('Format database MONIC tidak dikenal. Data lama tidak ditimpa.');
}
function resolveTenantId(db: MultiTenantDatabase, req: express.Request): string {
  const requested = (typeof req.query.tenantId === 'string' && req.query.tenantId.trim()) || req.header('x-tenant-id')?.trim() || db.activeTenantId;
  const company = db.tenantCompanies.find((tenant) => tenant.tenantId === requested) || db.tenantCompanies[0];
  if (!company) throw new Error('Belum ada tenant yang terdaftar.');
  return company.tenantId;
}
function buildTenantSummaries(db: MultiTenantDatabase): TenantSummary[] {
  return db.tenantCompanies.map((company) => {
    const workspace = db.workspaces[company.tenantId];
    const totalInventoryValue = (workspace?.materials || []).reduce((sum, material) => sum + Object.values(material.mbew).reduce((acc, item) => acc + item.salk3, 0), 0);
    return { ...company, materialCount: workspace?.materials.length || 0, plantCount: workspace?.plants.length || 0,
      totalInventoryValue, openPrCount: workspace?.purchaseRequisitions.filter((pr) => pr.status !== 'Converted to PO').length || 0,
      openPoCount: workspace?.purchaseOrders.filter((po) => po.status !== 'Completed').length || 0 };
  });
}
function buildBootstrapPayload(db: MultiTenantDatabase, tenantId: string): SapBootstrapPayload {
  const company = db.tenantCompanies.find((tenant) => tenant.tenantId === tenantId) || db.tenantCompanies[0];
  return { ...db.workspaces[company.tenantId], activeTenant: company, tenants: buildTenantSummaries(db),
    materialTypes: MATERIAL_TYPES, industrySectors: INDUSTRY_SECTORS, valuationTypes: VALUATION_TYPES };
}
function loadDatabase(req: express.Request): SapBootstrapPayload {
  const database = loadMultiTenantDatabase(), tenantId = resolveTenantId(database, req);
  const payload = buildBootstrapPayload(database, tenantId); databaseContexts.set(payload, { database, tenantId }); return payload;
}
function saveDatabase(payload: SapBootstrapPayload): void {
  const context = databaseContexts.get(payload);
  if (!context) throw new Error('Konteks tenant tidak ditemukan saat menyimpan data.');
  const workspace = context.database.workspaces[context.tenantId];
  workspace.materials = payload.materials; workspace.purchaseRequisitions = payload.purchaseRequisitions;
  workspace.purchaseOrders = payload.purchaseOrders; workspace.materialDocuments = payload.materialDocuments;
  workspace.customIndustryFields = payload.customIndustryFields; workspace.standardFieldRules = payload.standardFieldRules;
  workspace.changeDocuments = payload.changeDocuments; workspace.plants = payload.plants; workspace.vendors = payload.vendors;
  saveMultiTenantDatabase(context.database);
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
  let max = 941;
  for (const item of logs) {
    const num = Number.parseInt(item.changenr.replace('CHG-', ''), 10);
    if (!Number.isNaN(num) && num > max) {
      max = num;
    }
  }
  return `CHG-${String(max + 1).padStart(6, '0')}`;
}

function validateMaterialAgainstOms9(
  material: MaterialMasterRecord,
  db: SapBootstrapPayload,
  activeWerks: string
): string[] {
  const errors: string[] = [];
  const mbrsh = material.mara.mbrsh;

  if (!material.mara.matnr.trim()) errors.push('Material Number (MARA-MATNR) wajib diisi.');
  if (!material.mara.maktx.trim()) errors.push('Material Description (MARA-MAKTX) wajib diisi.');
  if (!material.mara.meins.trim()) errors.push('Base Unit of Measure (MARA-MEINS) wajib diisi.');

  // Standard OMS9 field rules check
  const plantData = material.marc[activeWerks];
  const storageKeys = Object.keys(material.mard).filter((k) => k.startsWith(`${activeWerks}-`));
  const firstStorage = storageKeys.length > 0 ? material.mard[storageKeys[0]] : undefined;
  const mbewData = material.mbew[activeWerks];

  for (const rule of db.standardFieldRules) {
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
      // Boolean flags: if required by OMS9, must be enabled (true) or explicitly set
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

  // Industry-specific CI_MARA custom fields check
  const relevantCustomFields = db.customIndustryFields.filter(
    (cf) => cf.industrySector === mbrsh && cf.status === 'required'
  );
  for (const cf of relevantCustomFields) {
    const val = material.industryExtensions?.[cf.fieldName];
    if (cf.dataType === 'boolean') continue;
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      errors.push(`CI_MARA [${mbrsh}]: Field spesifik industri "${cf.label}" (${cf.fieldName}) wajib diisi.`);
    }
  }

  return errors;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Bootstrap endpoint
  app.get('/api/bootstrap', (req, res) => {
    const db = loadDatabase(req);
    res.json(db);
  });


  app.post('/api/tenants', (req, res) => {
    const database = loadMultiTenantDatabase();
    const body = req.body as { bukrs?: string; name?: string; coreBusinessType?: TenantCoreBusinessType; city?: string };
    const bukrs = (body.bukrs || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const name = (body.name || '').trim();
    if (bukrs.length < 2) return res.status(400).json({ error: 'Company Code (BUKRS) minimal 2 karakter alfanumerik.' });
    if (!name) return res.status(400).json({ error: 'Nama perusahaan wajib diisi.' });
    if (database.tenantCompanies.some((tenant) => tenant.bukrs === bukrs)) return res.status(409).json({ error: `Company Code ${bukrs} sudah digunakan oleh tenant lain.` });
    const coreMeta = CORE_BUSINESS_OPTIONS.find((option) => option.value === body.coreBusinessType) || CORE_BUSINESS_OPTIONS[0];
    if (!coreMeta) return res.status(500).json({ error: 'Konfigurasi core business belum tersedia.' });
    const tenantId = `tenant-${bukrs.toLowerCase()}-${Date.now().toString(36)}`;
    const company: TenantCompany = { tenantId, bukrs, clientNumber: String((database.tenantCompanies.length + 1) * 100),
      name, shortName: name.replace(/^PT\s+/i, '').split(' ').slice(0, 2).join(' ') || name,
      coreBusiness: coreMeta.label, coreBusinessType: coreMeta.value, city: (body.city || 'Jakarta').trim(),
      defaultIndustry: coreMeta.defaultIndustry, description: coreMeta.summary };
    database.tenantCompanies.push(company);
    database.workspaces[tenantId] = createTenantTemplateWorkspace(company, coreMeta.value);
    database.activeTenantId = tenantId; saveMultiTenantDatabase(database);
    return res.status(201).json(buildBootstrapPayload(database, tenantId));
  });
  app.delete('/api/tenants/:tenantId', (req, res) => {
    const database = loadMultiTenantDatabase(), tenantId = req.params.tenantId;
    if (database.tenantCompanies.length <= 1) return res.status(400).json({ error: 'Minimal harus ada 1 perusahaan tenant aktif di sistem.' });
    const index = database.tenantCompanies.findIndex((tenant) => tenant.tenantId === tenantId);
    if (index < 0) return res.status(404).json({ error: 'Tenant tidak ditemukan.' });
    database.tenantCompanies.splice(index, 1); delete database.workspaces[tenantId];
    if (database.activeTenantId === tenantId) database.activeTenantId = database.tenantCompanies[0].tenantId;
    saveMultiTenantDatabase(database); return res.json(buildBootstrapPayload(database, database.activeTenantId));
  });

  // Public reset is disabled to prevent anyone from erasing shared application data.
  app.post('/api/reset', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // MM01 - Create Material Master
  app.post('/api/materials', (req, res) => {
    const db = loadDatabase(req);
    const { material, activeWerks = '1000', username = 'SAP_USER' } = req.body as {
      material: MaterialMasterRecord;
      activeWerks?: string;
      username?: string;
    };

    const existing = db.materials.find((m) => m.mara.matnr === material.mara.matnr);
    if (existing) {
      return res.status(409).json({
        error: `Material ${material.mara.matnr} sudah terdaftar di tabel MARA. Gunakan MM02 untuk mengubah.`,
      });
    }

    const validationErrors = validateMaterialAgainstOms9(material, db, activeWerks);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0], details: validationErrors });
    }

    const now = new Date().toISOString();
    material.mara.createdAt = now;
    material.mara.updatedAt = now;
    material.mara.createdBy = username;

    db.materials.unshift(material);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ material, db });
  });

  // MM02 - Update Material Master
  app.put('/api/materials/:matnr', (req, res) => {
    const db = loadDatabase(req);
    const { matnr } = req.params;
    const { material, activeWerks = '1000', username = 'SAP_USER' } = req.body as {
      material: MaterialMasterRecord;
      activeWerks?: string;
      username?: string;
    };

    const idx = db.materials.findIndex((m) => m.mara.matnr === matnr);
    if (idx === -1) {
      return res.status(404).json({ error: `Material ${matnr} tidak ditemukan di tabel MARA.` });
    }

    const validationErrors = validateMaterialAgainstOms9(material, db, activeWerks);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0], details: validationErrors });
    }

    const prev = db.materials[idx];
    const now = new Date().toISOString();
    material.mara.updatedAt = now;

    // Diff key fields for CDHDR / CDPOS
    const diffs: ChangeDocument[] = [];
    const addDiff = (tableName: string, fieldName: string, oldVal: unknown, newVal: unknown) => {
      const o = String(oldVal ?? '');
      const n = String(newVal ?? '');
      if (o !== n) {
        diffs.push({
          changenr: nextChangeNumber([...diffs, ...db.changeDocuments]),
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

    for (const cf of db.customIndustryFields.filter((f) => f.industrySector === material.mara.mbrsh)) {
      addDiff('CI_MARA', cf.fieldName, prev.industryExtensions?.[cf.fieldName], material.industryExtensions?.[cf.fieldName]);
    }

    if (diffs.length === 0) {
      diffs.push({
        changenr: nextChangeNumber(db.changeDocuments),
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

    db.materials[idx] = material;
    db.changeDocuments.unshift(...diffs);
    saveDatabase(db);
    return res.json({ material, db });
  });

  // Delete / Archive Material
  app.delete('/api/materials/:matnr', (req, res) => {
    const db = loadDatabase(req);
    const { matnr } = req.params;
    const idx = db.materials.findIndex((m) => m.mara.matnr === matnr);
    if (idx === -1) {
      return res.status(404).json({ error: `Material ${matnr} tidak ditemukan.` });
    }
    const openPos = db.purchaseOrders.filter((po) => po.matnr === matnr && po.status !== 'Completed');
    if (openPos.length > 0) {
      return res.status(400).json({
        error: `Material ${matnr} masih memiliki Purchase Order terbuka (${openPos[0].ebeln}). Tidak dapat dihapus.`,
      });
    }
    const totalStock = Object.values(db.materials[idx].mard).reduce(
      (sum, item) => sum + item.labst + item.insme + item.speme,
      0
    );
    if (totalStock > 0) {
      return res.status(400).json({
        error: `Material ${matnr} masih memiliki stok fisik (${totalStock}). Lakukan Goods Issue (MIGO 201) terlebih dahulu.`,
      });
    }
    db.materials.splice(idx, 1);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.json({ db });
  });

  // ME51N - Create Purchase Requisition
  app.post('/api/mm/prs', (req, res) => {
    const db = loadDatabase(req);
    const { matnr, werks, lgort, menge, lfdat, bwtar, username = 'MRP_PLANNER' } = req.body as {
      matnr: string;
      werks: string;
      lgort: string;
      menge: number;
      lfdat: string;
      bwtar?: ValuationTypeCode;
      username?: string;
    };

    const material = db.materials.find((m) => m.mara.matnr === matnr);
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
      db.purchaseRequisitions.map((p) => p.banfn),
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

    db.purchaseRequisitions.unshift(newPr);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ pr: newPr, db });
  });

  // Convert PR to PO
  app.post('/api/mm/prs/:banfn/convert', (req, res) => {
    const db = loadDatabase(req);
    const { banfn } = req.params;
    const { lifnr, netpr, eindt, bwtar, username = 'BUYER_MM' } = req.body as {
      lifnr: string;
      netpr?: number;
      eindt?: string;
      bwtar?: ValuationTypeCode;
      username?: string;
    };

    const pr = db.purchaseRequisitions.find((p) => p.banfn === banfn);
    if (!pr) return res.status(404).json({ error: `PR ${banfn} tidak ditemukan.` });
    if (pr.status === 'Converted to PO') {
      return res.status(400).json({ error: `PR ${banfn} sudah dikonversi menjadi PO ${pr.ebeln}.` });
    }

    const vendor = db.vendors.find((v) => v.lifnr === lifnr);
    if (!vendor) return res.status(404).json({ error: 'Vendor tidak ditemukan.' });

    const ebeln = nextSequence(
      '450000',
      db.purchaseOrders.map((o) => o.ebeln),
      4
    );

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
      netpr: netpr !== undefined ? Number(netpr) : pr.preis,
      peinh: 1,
      waers: pr.waers,
      bwtar: bwtar || pr.bwtar,
      ekgrp: pr.ekgrp,
      eindt: eindt || pr.lfdat,
      status: 'Open',
      banfn: pr.banfn,
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    pr.status = 'Converted to PO';
    pr.ebeln = ebeln;
    db.purchaseOrders.unshift(newPo);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ po: newPo, db });
  });

  // ME21N - Create Purchase Order directly
  app.post('/api/mm/pos', (req, res) => {
    const db = loadDatabase(req);
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

    const material = db.materials.find((m) => m.mara.matnr === matnr);
    if (!material) return res.status(404).json({ error: 'Material tidak ditemukan.' });
    if (material.mara.mstae === '01' || material.mara.mstae === '02') {
      return res.status(400).json({
        error: `Material ${matnr} berstatus Blocked (${material.mara.mstae}). Tidak dapat membuat Purchase Order.`,
      });
    }

    const vendor = db.vendors.find((v) => v.lifnr === lifnr);
    if (!vendor) return res.status(404).json({ error: 'Vendor tidak ditemukan.' });

    const marc = material.marc[werks] || Object.values(material.marc)[0];
    const mbew = material.mbew[werks] || Object.values(material.mbew)[0];
    const splitActive = Boolean(mbew?.bwtty);
    const resolvedBwtar = splitActive ? bwtar || 'LOCAL' : undefined;

    const ebeln = nextSequence(
      '450000',
      db.purchaseOrders.map((o) => o.ebeln),
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

    db.purchaseOrders.unshift(newPo);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ po: newPo, db });
  });

  // MIGO - Goods Movement (101 GR, 201 GI, 311 Transfer, 561 Initial)
  app.post('/api/mm/migo', (req, res) => {
    const db = loadDatabase(req);
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

    const material = db.materials.find((m) => m.mara.matnr === matnr);
    if (!material) return res.status(404).json({ error: `Material ${matnr} tidak ditemukan.` });

    if (material.mara.mstae === '02') {
      return res.status(400).json({ error: `Material ${matnr} diblokir total (MSTAE=02).` });
    }

    const plantDef = db.plants.find((p) => p.werks === werks);
    const slocDef = plantDef?.storageLocations.find((s) => s.lgort === lgort);
    const mardKey = `${werks}-${lgort}`;

    // Ensure MARD entry exists when receiving/initializing
    const ensureMard = (w: string, l: string) => {
      const k = `${w}-${l}`;
      if (!material.mard[k]) {
        const sDef = db.plants.find((p) => p.werks === w)?.storageLocations.find((s) => s.lgort === l);
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

    // Ensure MBEW entry exists for plant
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
      const po = db.purchaseOrders.find((o) => o.ebeln === ebeln);
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
      db.materialDocuments.map((d) => d.mblnr),
      5
    );
    const belnr = nextSequence(
      '49000',
      db.materialDocuments.map((d) => d.belnr),
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
    db.materialDocuments.unshift(doc);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ doc, db });
  });

  // OMS9 - Update Standard Field Rules
  app.put('/api/customizing/standard-rules', (req, res) => {
    const db = loadDatabase(req);
    const { rules, username = 'BASIS_ADMIN' } = req.body as {
      rules: StandardFieldRule[];
      username?: string;
    };

    db.standardFieldRules = rules;
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.json({ db });
  });

  // Add Custom Industry Append Field (CI_MARA)
  app.post('/api/customizing/industry-fields', (req, res) => {
    const db = loadDatabase(req);
    const { field, username = 'BASIS_ADMIN' } = req.body as {
      field: CustomIndustryField;
      username?: string;
    };

    const normalizedName = field.fieldName.toUpperCase().startsWith('ZZ_')
      ? field.fieldName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : `ZZ_${field.fieldName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;

    if (db.customIndustryFields.some((f) => f.fieldName === normalizedName && f.industrySector === field.industrySector)) {
      return res.status(409).json({
        error: `Field ${normalizedName} sudah ada di struktur CI_MARA untuk industri ${field.industrySector}.`,
      });
    }

    const newField: CustomIndustryField = {
      ...field,
      id: `cf-${Date.now()}`,
      fieldName: normalizedName,
    };

    db.customIndustryFields.push(newField);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.status(201).json({ field: newField, db });
  });

  // Update Custom Industry Append Field
  app.put('/api/customizing/industry-fields/:id', (req, res) => {
    const db = loadDatabase(req);
    const { id } = req.params;
    const { field, username = 'BASIS_ADMIN' } = req.body as {
      field: CustomIndustryField;
      username?: string;
    };

    const idx = db.customIndustryFields.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Custom field tidak ditemukan.' });

    const prev = db.customIndustryFields[idx];
    db.customIndustryFields[idx] = field;
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
      objectClass: 'CUSTOMIZING',
      objectId: `CI_MARA-${field.industrySector}`,
      tableName: 'CI_MARA',
      fieldName: field.fieldName,
      oldValue: `${prev.label} (${prev.status})`,
      newValue: `${field.label} (${field.status})`,
      username,
      timestamp: new Date().toISOString(),
    });

    saveDatabase(db);
    return res.json({ db });
  });

  // Delete Custom Industry Append Field
  app.delete('/api/customizing/industry-fields/:id', (req, res) => {
    const db = loadDatabase(req);
    const { id } = req.params;
    const idx = db.customIndustryFields.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Custom field tidak ditemukan.' });

    const removed = db.customIndustryFields[idx];
    db.customIndustryFields.splice(idx, 1);
    db.changeDocuments.unshift({
      changenr: nextChangeNumber(db.changeDocuments),
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
    return res.json({ db });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');

    app.use(express.static(distPath));

    // Return 404 for unknown API endpoints
    app.use('/api', (_req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
      });
    });

    // React SPA fallback (Express 4 compatible)
    app.get('*', (_req, res, next) => {
      res.sendFile(path.join(distPath, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MONIC server running on port ${PORT}`);
  });
}

startServer();
