export type MaterialTypeCode = 'ROH' | 'HALB' | 'FERT' | 'HAWA' | 'ERSA' | 'VERP';

export type IndustrySectorCode = 'M' | 'C' | 'P' | 'F' | 'R' | 'O';

export type FieldStatus = 'required' | 'optional' | 'display' | 'hide';

export type CustomFieldDataType = 'text' | 'number' | 'select' | 'boolean' | 'date';

export type MaterialViewKey =
  | 'basic'
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

export interface SapBootstrapPayload {
  materials: MaterialMasterRecord[];
  purchaseRequisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  materialDocuments: MaterialDocument[];
  customIndustryFields: CustomIndustryField[];
  standardFieldRules: StandardFieldRule[];
  changeDocuments: ChangeDocument[];
  plants: PlantDefinition[];
  vendors: VendorDefinition[];
  materialTypes: MaterialTypeDefinition[];
  industrySectors: IndustrySectorDefinition[];
  valuationTypes: ValuationTypeDefinition[];
}
