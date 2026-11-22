export type MaterialTypeCode = 'HAWA';

export type IndustrySectorCode = 'M';

export type FieldStatus = 'required' | 'optional' | 'display' | 'hide';

export type CustomFieldDataType = 'text' | 'number' | 'select' | 'boolean' | 'date';

export type MaterialViewKey =
  | 'basic'
  | 'classification'
  | 'purchasing'
  | 'mrp'
  | 'storage'
  | 'accounting'
  | 'sales'
  | 'industry';

export interface PlantDefinition {
  werks: string;
  name: string;
  city: string;
  bukrs: string;
  storageLocations: {
    lgort: string;
    lgobe: string;
    type: string;
  }[];
}

export interface VendorDefinition {
  lifnr: string;
  name: string;
  city: string;
  ekorg: string;
  paymentTerms: string;
}

export interface MaterialTypeDefinition {
  mtart: MaterialTypeCode;
  label: string;
  description: string;
  defaultBklas: string;
  priceControlDefault: 'V' | 'S';
  internalNumberPrefix: string;
}

export interface IndustrySectorDefinition {
  mbrsh: IndustrySectorCode;
  label: string;
  shortLabel: string;
  description: string;
  regulatoryContext: string;
}

export interface CustomIndustryField {
  id: string;
  fieldName: string; // e.g. ZZ_CAS_NUMBER
  label: string;
  industrySector: IndustrySectorCode;
  targetView: MaterialViewKey;
  dataType: CustomFieldDataType;
  unit?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
  helpText: string;
  status: FieldStatus;
}

export interface StandardFieldRule {
  fieldKey: string;
  technicalName: string; // e.g. MARA-BRGEW
  tableName: 'MARA' | 'MARC' | 'MARD' | 'MBEW' | 'MVKE';
  viewKey: MaterialViewKey;
  label: string;
  rulesByIndustry: Record<IndustrySectorCode, FieldStatus>;
}

export type CharacteristicDataType = 'text' | 'number' | 'select' | 'boolean';

export interface MasterCharacteristic {
  id: string;
  charName: string; // CT04 technical characteristic name, e.g. CHR_PIPE_OD
  label: string;
  dataType: CharacteristicDataType;
  unit?: string;
  options?: string[];
  required: boolean;
  helpText: string;
}

export interface MaterialGroupDefinition {
  matkl: string; // MARA-MATKL
  label: string;
  defaultMtart?: MaterialTypeCode;
  defaultBklas?: string; // OMQW default Valuation Class (e.g. 3500, 3040, 3030, 3100, 3200)
  description: string;
  characteristics: MasterCharacteristic[];
}

export interface ValuationClassDefinition {
  bklas: string;
  label: string;
  glAccount: string;
  description: string;
}

export const VALUATION_CLASSES: ValuationClassDefinition[] = [
  { bklas: '3500', label: 'Heavy Equipment & Vehicle Units', glAccount: '145000', description: 'Unit alat berat & kendaraan operasional (UN-*)' },
  { bklas: '3100', label: 'Trading Goods', glAccount: '141000', description: 'Barang dagang anak usaha & peralatan siap jual' },
  { bklas: '3040', label: 'Spare Parts / MRO', glAccount: '140200', description: 'Suku cadang alat berat, kendaraan, filter & ban' },
  { bklas: '3030', label: 'Operating Supplies & Consumables', glAccount: '140250', description: 'Pelumas, welding, tools & APD pemakaian operasional induk' },
  { bklas: '3200', label: 'Services (OMQW)', glAccount: '510200', description: 'Jasa kalibrasi, refill APAR, repair & rental unit' },
  { bklas: '3050', label: 'Packaging Materials', glAccount: '140300', description: 'Material kemasan & pengemasan' },
  { bklas: '7900', label: 'Semi-Finished Goods', glAccount: '142000', description: 'Barang setengah jadi / fabrikasi' },
  { bklas: '7920', label: 'Finished Goods', glAccount: '143000', description: 'Barang jadi hasil produksi' },
];

export type UomDimension = 'Count' | 'Weight' | 'Volume' | 'Length' | 'Packaging' | 'Time';

export interface UnitOfMeasureDefinition {
  msehi: string; // SAP T006 internal UoM code (e.g. PC, EA, UNIT, KG, L)
  label: string;
  isoCode: string;
  dimension: UomDimension;
  decimalPlaces: number;
  description: string;
}

export interface MaraData {
  matnr: string;
  maktx: string;
  mtart: MaterialTypeCode;
  mbrsh: IndustrySectorCode;
  meins: string;
  matkl: string;
  bismt: string;
  spart: string;
  brgew: number;
  ntgew: number;
  gewei: string;
  volum: number;
  voleh: string;
  groes: string;
  ean11: string;
  mstae: '' | '01' | '02' | 'Z1'; // '' Active, '01' Blocked for Procurement, '02' Blocked for All, 'Z1' Obsolete
  xchpf: boolean; // Batch management
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface MarcPlantData {
  werks: string;
  ekgrp: string;
  bstme: string;
  ekwsl: string;
  kautb: boolean;
  webaz: number;
  kordp: boolean;
  dismm: 'PD' | 'VB' | 'ND' | 'VV';
  dispo: string;
  minbe: number;
  disls: 'EX' | 'FX' | 'HB';
  bstmi: number;
  bstma: number;
  bstfe: number;
  eisbe: number;
  beskz: 'F' | 'E' | 'X';
  plifz: number;
  mtvfp: '01' | '02' | 'KP';
  prctr: string;
  sernp: string;
}

export interface MardStorageData {
  werks: string;
  lgort: string;
  lgobe: string;
  lgpbe: string; // Storage bin
  labst: number; // Unrestricted-use stock
  insme: number; // Quality inspection stock
  speme: number; // Blocked stock
  raube: string; // Storage conditions
  tempb: string; // Temperature conditions
  maxlz: number; // Max storage period
  mhdrz: number; // Min remaining shelf life
  mhdhb: number; // Total shelf life
}

export type ValuationTypeCode = 'LOCAL' | 'IMPORT' | 'FREE' | 'OLD';

export type ValuationCategoryCode = '' | 'H' | 'C' | 'Z';

export interface ValuationTypeDefinition {
  bwtar: ValuationTypeCode;
  label: string;
  description: string;
  defaultPriceRule: string;
}

export interface SplitValuationItem {
  bwtar: ValuationTypeCode;
  bklas: string;
  vprsv: 'V' | 'S';
  verpr: number;
  stprs: number;
  peinh: number;
  lbkum: number;
  salk3: number;
}

export interface MbewValuationData {
  bwkey: string; // Valuation area (= werks)
  bwtty?: ValuationCategoryCode; // Valuation category for split valuation
  bklas: string;
  vprsv: 'V' | 'S';
  verpr: number; // Moving average price
  stprs: number; // Standard price
  peinh: number; // Price unit
  waers: string;
  lbkum: number; // Total valuated stock
  salk3: number; // Total value
  splitValuations?: Partial<Record<ValuationTypeCode, SplitValuationItem>>;
}

export interface MvkeSalesData {
  vkorg: string;
  vtweg: string;
  dwerk: string;
  taxkm: '0' | '1';
  mtpos: string;
  kondm: string;
  tragr: string;
  ladgr: string;
}

export interface MaterialMasterRecord {
  mara: MaraData;
  marc: Record<string, MarcPlantData>;
  mard: Record<string, MardStorageData>; // key: `${werks}-${lgort}`
  mbew: Record<string, MbewValuationData>; // key: `${werks}`
  mvke: MvkeSalesData;
  characteristics?: Record<string, string | number | boolean>; // AUSP values per MATKL Master Characteristic
  industryExtensions: Record<string, string | number | boolean>;
}

export interface PurchaseRequisition {
  banfn: string;
  matnr: string;
  maktx: string;
  werks: string;
  lgort: string;
  menge: number;
  meins: string;
  lfdat: string;
  ekgrp: string;
  dispo: string;
  preis: number;
  waers: string;
  bwtar?: ValuationTypeCode;
  status: 'Open' | 'Approved' | 'Converted to PO';
  ebeln?: string;
  createdAt: string;
  createdBy: string;
}

export interface PurchaseOrder {
  ebeln: string;
  lifnr: string;
  vendorName: string;
  matnr: string;
  maktx: string;
  werks: string;
  lgort: string;
  menge: number;
  receivedQty: number;
  meins: string;
  netpr: number;
  peinh: number;
  waers: string;
  bwtar?: ValuationTypeCode;
  ekgrp: string;
  eindt: string;
  status: 'Open' | 'Partially Received' | 'Completed';
  banfn?: string;
  createdAt: string;
  createdBy: string;
}

export type MovementTypeCode = '101' | '201' | '311' | '561';

export interface MaterialDocument {
  mblnr: string;
  mjahr: string;
  bwart: MovementTypeCode;
  bwartDesc: string;
  matnr: string;
  maktx: string;
  werks: string;
  lgort: string;
  targetLgort?: string;
  ebeln?: string;
  kostl?: string;
  menge: number;
  meins: string;
  dmbtr: number;
  waers: string;
  bwtar?: ValuationTypeCode;
  belnr: string;
  budat: string;
  usnam: string;
  bktxt: string;
}

export interface ChangeDocument {
  changenr: string;
  objectClass: 'MATERIAL' | 'CUSTOMIZING' | 'MM_DOC';
  objectId: string;
  tableName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  username: string;
  timestamp: string;
}

export type TenantCoreBusinessType =
  | 'oil_gas_contractor'
  | 'heavy_workshop'
  | 'unit_spareparts'
  | 'tools_ppe'
  | 'calibration_service'
  | 'general_industry';

export interface TenantCompany {
  tenantId: string;
  bukrs: string; // SAP Company Code
  clientNumber: string; // e.g. '100', '200', '300', '400'
  name: string;
  shortName: string;
  coreBusiness: string;
  coreBusinessType: TenantCoreBusinessType;
  city: string;
  defaultIndustry: IndustrySectorCode;
  description: string;
}

export interface TenantSummary extends TenantCompany {
  materialCount: number;
  plantCount: number;
  totalInventoryValue: number;
  openPrCount: number;
  openPoCount: number;
}

export interface TenantWorkspaceData {
  materials: MaterialMasterRecord[];
  purchaseRequisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  materialDocuments: MaterialDocument[];
  customIndustryFields: CustomIndustryField[];
  standardFieldRules: StandardFieldRule[];
  materialGroups: MaterialGroupDefinition[];
  unitsOfMeasure: UnitOfMeasureDefinition[];
  changeDocuments: ChangeDocument[];
  plants: PlantDefinition[];
  vendors: VendorDefinition[];
}

export interface MultiTenantDatabase {
  schemaVersion: number;
  activeTenantId: string;
  tenantCompanies: TenantCompany[];
  workspaces: Record<string, TenantWorkspaceData>;
  corporateMaraMaterials?: MaterialMasterRecord[];
}

export interface SapBootstrapPayload extends TenantWorkspaceData {
  activeTenant: TenantCompany;
  tenants: TenantSummary[];
  corporateMaraMaterials: MaterialMasterRecord[];
  materialTypes: MaterialTypeDefinition[];
  industrySectors: IndustrySectorDefinition[];
  valuationTypes: ValuationTypeDefinition[];
}
