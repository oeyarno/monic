import type { MaterialClassificationClass } from '../src/types/sap.ts';

export const MATERIAL_CLASS_TEMPLATES: MaterialClassificationClass[] = [
  {
    "className": "CLS_HE_EXCAVATOR",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Excavator",
    "characteristics": [
      {
        "id": "cls_he_excavator-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Komatsu, CAT, Kobelco, Hitachi"
      },
      {
        "id": "cls_he_excavator-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: PC200-8, PC300-8, 320D"
      },
      {
        "id": "cls_he_excavator-ch_oper_weight",
        "charName": "CH_OPER_WEIGHT",
        "label": "Oper Weight",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 20 Ton, 30 Ton"
      },
      {
        "id": "cls_he_excavator-ch_bucket_cap",
        "charName": "CH_BUCKET_CAP",
        "label": "Bucket Cap",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 0.8 m³, 1.2 m³"
      },
      {
        "id": "cls_he_excavator-ch_arm_type",
        "charName": "CH_ARM_TYPE",
        "label": "Arm Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Standard Arm, Long Arm"
      }
    ]
  },
  {
    "className": "CLS_HE_DOZER",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Bulldozer",
    "characteristics": [
      {
        "id": "cls_he_dozer-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Komatsu, CAT"
      },
      {
        "id": "cls_he_dozer-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: D65P-12, D85ESS"
      },
      {
        "id": "cls_he_dozer-ch_engine_hp",
        "charName": "CH_ENGINE_HP",
        "label": "Engine Hp",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 190 HP, 215 HP"
      },
      {
        "id": "cls_he_dozer-ch_blade_type",
        "charName": "CH_BLADE_TYPE",
        "label": "Blade Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Straight Tilt, Angle Blade"
      },
      {
        "id": "cls_he_dozer-ch_shoe_type",
        "charName": "CH_SHOE_TYPE",
        "label": "Shoe Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Swamp Shoe, Standard Shoe"
      }
    ]
  },
  {
    "className": "CLS_HE_GRADER",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Motor Grader",
    "characteristics": [
      {
        "id": "cls_he_grader-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Komatsu, CAT"
      },
      {
        "id": "cls_he_grader-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: GD511A, 120K"
      },
      {
        "id": "cls_he_grader-ch_blade_len",
        "charName": "CH_BLADE_LEN",
        "label": "Blade Len",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 12 Feet, 14 Feet"
      },
      {
        "id": "cls_he_grader-ch_ripper",
        "charName": "CH_RIPPER",
        "label": "Ripper",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: With Ripper, Without Ripper"
      }
    ]
  },
  {
    "className": "CLS_HE_CRANE",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Crane / Lifting",
    "characteristics": [
      {
        "id": "cls_he_crane-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tadano, Kato, Kobelco"
      },
      {
        "id": "cls_he_crane-ch_crane_type",
        "charName": "CH_CRANE_TYPE",
        "label": "Crane Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Rough Terrain, Crawler, Mobile"
      },
      {
        "id": "cls_he_crane-ch_max_load",
        "charName": "CH_MAX_LOAD",
        "label": "Max Load",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 25 Ton, 50 Ton, 100 Ton"
      },
      {
        "id": "cls_he_crane-ch_boom_len",
        "charName": "CH_BOOM_LEN",
        "label": "Boom Len",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 30 Meter, 42 Meter"
      }
    ]
  },
  {
    "className": "CLS_HE_COMPACTOR",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Compactor / Vibro",
    "characteristics": [
      {
        "id": "cls_he_compactor-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Sakai, Bomag, Hamm"
      },
      {
        "id": "cls_he_compactor-ch_drum_type",
        "charName": "CH_DRUM_TYPE",
        "label": "Drum Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Single Drum, Tandem, Padfoot"
      },
      {
        "id": "cls_he_compactor-ch_oper_weight",
        "charName": "CH_OPER_WEIGHT",
        "label": "Oper Weight",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 10 Ton, 12 Ton"
      }
    ]
  },
  {
    "className": "CLS_HE_ATTACH",
    "classType": "001",
    "description": "1. HEAVY EQUIPMENT · Heavy Equip. Attachment",
    "characteristics": [
      {
        "id": "cls_he_attach-ch_att_type",
        "charName": "CH_ATT_TYPE",
        "label": "Att Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hydraulic Breaker, Ripper, Clamshell"
      },
      {
        "id": "cls_he_attach-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Furukawa, Soosan, Komatsu"
      },
      {
        "id": "cls_he_attach-ch_equip_app",
        "charName": "CH_EQUIP_APP",
        "label": "Equip App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Class 20T / PC200, Class 30T"
      },
      {
        "id": "cls_he_attach-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Chisel 135mm, 1.0 m³"
      }
    ]
  },
  {
    "className": "CLS_HV_DUMPTRUCK",
    "classType": "001",
    "description": "2. HEAVY VEHICLE · Dump Truck",
    "characteristics": [
      {
        "id": "cls_hv_dumptruck-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino, Mitsubishi Fuso, Isuzu, Volvo"
      },
      {
        "id": "cls_hv_dumptruck-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: FM260JD, FVZ 285, FMX400"
      },
      {
        "id": "cls_hv_dumptruck-ch_axle",
        "charName": "CH_AXLE",
        "label": "Axle",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 6x4, 8x4, 4x2"
      },
      {
        "id": "cls_hv_dumptruck-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 20 m³, 24 m³, 30 Ton"
      }
    ]
  },
  {
    "className": "CLS_HV_TRAILER",
    "classType": "001",
    "description": "2. HEAVY VEHICLE · Prime Mover & Trailer",
    "characteristics": [
      {
        "id": "cls_hv_trailer-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino, Volvo, Scania, Nissan UD"
      },
      {
        "id": "cls_hv_trailer-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SG285TH, FM440, Quester"
      },
      {
        "id": "cls_hv_trailer-ch_axle",
        "charName": "CH_AXLE",
        "label": "Axle",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 6x4, 6x2"
      },
      {
        "id": "cls_hv_trailer-ch_trailer_type",
        "charName": "CH_TRAILER_TYPE",
        "label": "Trailer Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Lowbed 2-Axle, Lowbed 3-Axle, Flatbed"
      },
      {
        "id": "cls_hv_trailer-ch_max_load",
        "charName": "CH_MAX_LOAD",
        "label": "Max Load",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 30 Ton, 40 Ton, 60 Ton"
      }
    ]
  },
  {
    "className": "CLS_HV_TANKER",
    "classType": "001",
    "description": "2. HEAVY VEHICLE · Water & Fuel Tanker",
    "characteristics": [
      {
        "id": "cls_hv_tanker-ch_tank_func",
        "charName": "CH_TANK_FUNC",
        "label": "Tank Func",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Fuel Tanker / Tangki Solar, Water Truck"
      },
      {
        "id": "cls_hv_tanker-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino, Fuso, Isuzu"
      },
      {
        "id": "cls_hv_tanker-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: FM260, FG235"
      },
      {
        "id": "cls_hv_tanker-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 5.000 L, 10.000 L, 16.000 L"
      }
    ]
  },
  {
    "className": "CLS_HV_BUS",
    "classType": "001",
    "description": "2. HEAVY VEHICLE · Bus & Crew Transport",
    "characteristics": [
      {
        "id": "cls_hv_bus-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Mitsubishi, Hino, Isuzu"
      },
      {
        "id": "cls_hv_bus-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: FE71, FE84, Elf NLR"
      },
      {
        "id": "cls_hv_bus-ch_seat_cap",
        "charName": "CH_SEAT_CAP",
        "label": "Seat Cap",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 16 Seat, 25 Seat, 30 Seat"
      },
      {
        "id": "cls_hv_bus-ch_ac_spec",
        "charName": "CH_AC_SPEC",
        "label": "Ac Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: AC Ducting, Non-AC"
      }
    ]
  },
  {
    "className": "CLS_BDY_VESSEL",
    "classType": "001",
    "description": "3. BODY BUILDING · Karoseri Dump & Flatbed",
    "characteristics": [
      {
        "id": "cls_bdy_vessel-ch_bdy_type",
        "charName": "CH_BDY_TYPE",
        "label": "Bdy Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Dump Vessel, Flatbed, Bak Besi"
      },
      {
        "id": "cls_bdy_vessel-ch_mat_grade",
        "charName": "CH_MAT_GRADE",
        "label": "Mat Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hardox 450, Mild Steel SS400 6mm"
      },
      {
        "id": "cls_bdy_vessel-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 16 m³, 20 m³, 24 m³"
      },
      {
        "id": "cls_bdy_vessel-ch_chassis_fit",
        "charName": "CH_CHASSIS_FIT",
        "label": "Chassis Fit",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino 500 6x4, Fuso Fighter"
      }
    ]
  },
  {
    "className": "CLS_BDY_TANK",
    "classType": "001",
    "description": "3. BODY BUILDING · Karoseri Tangki",
    "characteristics": [
      {
        "id": "cls_bdy_tank-ch_tank_func",
        "charName": "CH_TANK_FUNC",
        "label": "Tank Func",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tangki Solar, Tangki Air, Vacuum Tank"
      },
      {
        "id": "cls_bdy_tank-ch_mat_grade",
        "charName": "CH_MAT_GRADE",
        "label": "Mat Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Mild Steel 4mm/6mm, Stainless 304"
      },
      {
        "id": "cls_bdy_tank-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 5 KL, 8 KL, 10 KL, 16 KL"
      },
      {
        "id": "cls_bdy_tank-ch_pump_spec",
        "charName": "CH_PUMP_SPEC",
        "label": "Pump Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: With Flowmeter & Pump, Gravity"
      }
    ]
  },
  {
    "className": "CLS_LV_DOUBLECAB",
    "classType": "001",
    "description": "4. LIGHT VEHICLE · Double Cabin 4x4",
    "characteristics": [
      {
        "id": "cls_lv_doublecab-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Toyota, Mitsubishi, Isuzu, Ford"
      },
      {
        "id": "cls_lv_doublecab-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hilux 2.4 G, Triton HDX, D-Max"
      },
      {
        "id": "cls_lv_doublecab-ch_drive",
        "charName": "CH_DRIVE",
        "label": "Drive",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 4x4 / 4WD"
      },
      {
        "id": "cls_lv_doublecab-ch_transmission",
        "charName": "CH_TRANSMISSION",
        "label": "Transmission",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Manual / MT, Automatic / AT"
      },
      {
        "id": "cls_lv_doublecab-ch_hse_spec",
        "charName": "CH_HSE_SPEC",
        "label": "Hse Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: ROPS, Roll Bar, Spark Arrestor, Rotary Lamp"
      }
    ]
  },
  {
    "className": "CLS_LV_PASSENGER",
    "classType": "001",
    "description": "4. LIGHT VEHICLE · MPV, SUV & Minibus",
    "characteristics": [
      {
        "id": "cls_lv_passenger-ch_body_style",
        "charName": "CH_BODY_STYLE",
        "label": "Body Style",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: MPV, SUV, Minibus Commuter"
      },
      {
        "id": "cls_lv_passenger-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Toyota, Mitsubishi, Daihatsu"
      },
      {
        "id": "cls_lv_passenger-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Innova Reborn, Fortuner, HiAce"
      },
      {
        "id": "cls_lv_passenger-ch_drive",
        "charName": "CH_DRIVE",
        "label": "Drive",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 4x2, 4x4"
      }
    ]
  },
  {
    "className": "CLS_PROP_LAND",
    "classType": "001",
    "description": "16. PROPERTY · Tanah & Lahan Yard",
    "characteristics": [
      {
        "id": "cls_prop_land-ch_land_use",
        "charName": "CH_LAND_USE",
        "label": "Land Use",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Yard Alat Berat, Lahan Kantor, Gudang"
      },
      {
        "id": "cls_prop_land-ch_area_m2",
        "charName": "CH_AREA_M2",
        "label": "Area M2",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 2.500 m², 5.000 m², 10.000 m²"
      },
      {
        "id": "cls_prop_land-ch_location",
        "charName": "CH_LOCATION",
        "label": "Location",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pekanbaru, Duri KM-8, Minas"
      },
      {
        "id": "cls_prop_land-ch_cert_type",
        "charName": "CH_CERT_TYPE",
        "label": "Cert Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SHM, HGB, SKGR"
      }
    ]
  },
  {
    "className": "CLS_PROP_BLDG",
    "classType": "001",
    "description": "16. PROPERTY · Bangunan & Workshop",
    "characteristics": [
      {
        "id": "cls_prop_bldg-ch_bldg_type",
        "charName": "CH_BLDG_TYPE",
        "label": "Bldg Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kantor Permanen, Workshop, Gudang, Mess"
      },
      {
        "id": "cls_prop_bldg-ch_construct",
        "charName": "CH_CONSTRUCT",
        "label": "Construct",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Konstruksi Baja WF, Beton Permanen"
      },
      {
        "id": "cls_prop_bldg-ch_area_m2",
        "charName": "CH_AREA_M2",
        "label": "Area M2",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 500 m², 1.200 m²"
      },
      {
        "id": "cls_prop_bldg-ch_location",
        "charName": "CH_LOCATION",
        "label": "Location",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pekanbaru, Duri, Minas"
      }
    ]
  },
  {
    "className": "CLS_SP_FILTER",
    "classType": "001",
    "description": "10. SPAREPART · Filters & Elements",
    "characteristics": [
      {
        "id": "cls_sp_filter-ch_filter_type",
        "charName": "CH_FILTER_TYPE",
        "label": "Filter Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Oil Filter, Fuel Filter, Air Filter, Hydraulic Filter"
      },
      {
        "id": "cls_sp_filter-ch_part_no",
        "charName": "CH_PART_NO",
        "label": "Part No",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 6754-71-5340, 1R-0750, P551808, LF9009"
      },
      {
        "id": "cls_sp_filter-ch_equip_app",
        "charName": "CH_EQUIP_APP",
        "label": "Equip App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: PC200-8, D65P, Hino FM260, Hilux 2.4"
      },
      {
        "id": "cls_sp_filter-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Komatsu, Donaldson, Fleetguard, Sakura"
      }
    ]
  },
  {
    "className": "CLS_SP_HYDRAULIC",
    "classType": "001",
    "description": "10. SPAREPART · Hydraulic Hose & Seal",
    "characteristics": [
      {
        "id": "cls_sp_hydraulic-ch_hyd_type",
        "charName": "CH_HYD_TYPE",
        "label": "Hyd Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hydraulic Hose, Seal Kit Boom/Arm, Hydraulic Pump"
      },
      {
        "id": "cls_sp_hydraulic-ch_part_no",
        "charName": "CH_PART_NO",
        "label": "Part No",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 707-99-46600, 20Y-62-41510"
      },
      {
        "id": "cls_sp_hydraulic-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 1/2\" x 150cm 4SP, 3/4\" x 200cm R2"
      },
      {
        "id": "cls_sp_hydraulic-ch_fitting_type",
        "charName": "CH_FITTING_TYPE",
        "label": "Fitting Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: JIC Female 90°, ORFS, Flange"
      }
    ]
  },
  {
    "className": "CLS_SP_UNDERCAR",
    "classType": "001",
    "description": "10. SPAREPART · Undercarriage & GET",
    "characteristics": [
      {
        "id": "cls_sp_undercar-ch_uc_type",
        "charName": "CH_UC_TYPE",
        "label": "Uc Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Track Shoe, Track Link, Roller, Idler, Bucket Tooth, Cutting Edge"
      },
      {
        "id": "cls_sp_undercar-ch_part_no",
        "charName": "CH_PART_NO",
        "label": "Part No",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 205-70-19570, 20Y-30-00014"
      },
      {
        "id": "cls_sp_undercar-ch_equip_app",
        "charName": "CH_EQUIP_APP",
        "label": "Equip App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: PC200-8, PC300-8, D65P-12"
      },
      {
        "id": "cls_sp_undercar-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Komatsu, Berco, ITR, Hensley"
      }
    ]
  },
  {
    "className": "CLS_SP_ENGINE",
    "classType": "001",
    "description": "10. SPAREPART · Engine, Drivetrain & Brake",
    "characteristics": [
      {
        "id": "cls_sp_engine-ch_sys_type",
        "charName": "CH_SYS_TYPE",
        "label": "Sys Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Engine Part, Clutch/Kopling, Brake Lining, Radiator, Turbo"
      },
      {
        "id": "cls_sp_engine-ch_part_no",
        "charName": "CH_PART_NO",
        "label": "Part No",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 47441-E0120, 31250-E0430, 04465-0K240"
      },
      {
        "id": "cls_sp_engine-ch_equip_app",
        "charName": "CH_EQUIP_APP",
        "label": "Equip App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino FM260, Hilux 2.4, PC200-8"
      },
      {
        "id": "cls_sp_engine-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Hino Genuine, Toyota Genuine, Denso"
      }
    ]
  },
  {
    "className": "CLS_SP_GENERAL",
    "classType": "001",
    "description": "10. SPAREPART · General Parts (Bearing/Belt)",
    "characteristics": [
      {
        "id": "cls_sp_general-ch_gen_type",
        "charName": "CH_GEN_TYPE",
        "label": "Gen Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Ball Bearing, Tapered Roller Bearing, V-Belt, Oil Seal"
      },
      {
        "id": "cls_sp_general-ch_part_no",
        "charName": "CH_PART_NO",
        "label": "Part No",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 6308-2RS, 32212, RECMF-8450"
      },
      {
        "id": "cls_sp_general-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: ID 40 x OD 90 x W 23 mm"
      },
      {
        "id": "cls_sp_general-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SKF, NSK, Koyo, Bando, Gates"
      }
    ]
  },
  {
    "className": "CLS_LUB_OIL",
    "classType": "001",
    "description": "6. LUBRICANT · Engine, Hydraulic & Gear Oil",
    "characteristics": [
      {
        "id": "cls_lub_oil-ch_oil_app",
        "charName": "CH_OIL_APP",
        "label": "Oil App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Engine Oil, Hydraulic Oil, Transmission/Gardan Oil"
      },
      {
        "id": "cls_lub_oil-ch_viscosity",
        "charName": "CH_VISCOSITY",
        "label": "Viscosity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SAE 15W-40, SAE 10W, SAE 90, ISO VG 46/68"
      },
      {
        "id": "cls_lub_oil-ch_api_spec",
        "charName": "CH_API_SPEC",
        "label": "Api Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: API CI-4, API GL-5, AW-68"
      },
      {
        "id": "cls_lub_oil-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Drum 209L, Pail 20L, Galon 4L/5L"
      },
      {
        "id": "cls_lub_oil-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pertamina Medran/Turalik, Shell Rimula/Tellus"
      }
    ]
  },
  {
    "className": "CLS_LUB_GREASE",
    "classType": "001",
    "description": "6. LUBRICANT · Grease & Specialty Lub.",
    "characteristics": [
      {
        "id": "cls_lub_grease-ch_grease_type",
        "charName": "CH_GREASE_TYPE",
        "label": "Grease Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Lithium EP Grease, High Temp Grease, Wire Rope Lub"
      },
      {
        "id": "cls_lub_grease-ch_nlgi_grade",
        "charName": "CH_NLGI_GRADE",
        "label": "Nlgi Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: NLGI EP-2, NLGI EP-3"
      },
      {
        "id": "cls_lub_grease-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Drum 180kg, Pail 16kg, Cartridge 400g"
      },
      {
        "id": "cls_lub_grease-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pertamina SGX-NL, Shell Gadus, Mobilux"
      }
    ]
  },
  {
    "className": "CLS_CHM_MAINT",
    "classType": "001",
    "description": "8. CHEMICAL · Maintenance Chemicals",
    "characteristics": [
      {
        "id": "cls_chm_maint-ch_chm_type",
        "charName": "CH_CHM_TYPE",
        "label": "Chm Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Radiator Coolant, Engine Degreaser, Contact Cleaner, WD-40"
      },
      {
        "id": "cls_chm_maint-ch_concentr",
        "charName": "CH_CONCENTR",
        "label": "Concentr",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Premix 50/50, Concentrate"
      },
      {
        "id": "cls_chm_maint-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Can 400ml, Jerigen 5L, Pail 20L, Drum 200L"
      },
      {
        "id": "cls_chm_maint-ch_hazard",
        "charName": "CH_HAZARD",
        "label": "Hazard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Flammable, Corrosive, Non-B3"
      }
    ]
  },
  {
    "className": "CLS_FUEL_BULK",
    "classType": "001",
    "description": "17. FUEL · Bahan Bakar Minyak (BBM)",
    "characteristics": [
      {
        "id": "cls_fuel_bulk-ch_fuel_type",
        "charName": "CH_FUEL_TYPE",
        "label": "Fuel Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Solar / Diesel, Bensin / Gasoline"
      },
      {
        "id": "cls_fuel_bulk-ch_grade",
        "charName": "CH_GRADE",
        "label": "Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: HSD Industri, Biosolar B35/B40, Dexlite, Pertalite"
      },
      {
        "id": "cls_fuel_bulk-ch_subsidy",
        "charName": "CH_SUBSIDY",
        "label": "Subsidy",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Non-Subsidi Industri, Retail SPBU"
      }
    ]
  },
  {
    "className": "CLS_BAT_AUTO",
    "classType": "001",
    "description": "18. BATTERY · Aki Basah & Kering",
    "characteristics": [
      {
        "id": "cls_bat_auto-ch_jis_din",
        "charName": "CH_JIS_DIN",
        "label": "Jis Din",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: NS40ZL, NS60, N70Z, N100, N120, N150, N200"
      },
      {
        "id": "cls_bat_auto-ch_volt_ah",
        "charName": "CH_VOLT_AH",
        "label": "Volt Ah",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 12V 45Ah, 12V 70Ah, 12V 100Ah, 12V 200Ah"
      },
      {
        "id": "cls_bat_auto-ch_bat_type",
        "charName": "CH_BAT_TYPE",
        "label": "Bat Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Wet / Basah, MF / Kering"
      },
      {
        "id": "cls_bat_auto-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: GS Astra, Yuasa, Incoe"
      }
    ]
  },
  {
    "className": "CLS_TIRE_MAIN",
    "classType": "001",
    "description": "19. TIRE · Ban Luar, Ban Dalam & Flap",
    "characteristics": [
      {
        "id": "cls_tire_main-ch_tire_comp",
        "charName": "CH_TIRE_COMP",
        "label": "Tire Comp",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Ban Luar / Tire, Ban Dalam / Tube, Marset / Flap"
      },
      {
        "id": "cls_tire_main-ch_tire_size",
        "charName": "CH_TIRE_SIZE",
        "label": "Tire Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 10.00-20, 11.00-20, 265/65 R17, 14.00-24, 20.5-25"
      },
      {
        "id": "cls_tire_main-ch_ply_rating",
        "charName": "CH_PLY_RATING",
        "label": "Ply Rating",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 14 PR, 16 PR, 18 PR, 20 PR, 24 PR"
      },
      {
        "id": "cls_tire_main-ch_pattern",
        "charName": "CH_PATTERN",
        "label": "Pattern",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: M/T Mud Terrain, A/T, Lug / OTR, Rib"
      },
      {
        "id": "cls_tire_main-ch_const_type",
        "charName": "CH_CONST_TYPE",
        "label": "Const Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Radial, Bias, Tubeless, Tube Type"
      },
      {
        "id": "cls_tire_main-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Bridgestone, Michelin, Goodyear, Gajah Tunggal, BKT"
      }
    ]
  },
  {
    "className": "CLS_TL_HAND",
    "classType": "001",
    "description": "5. TOOLS · Hand Tools & Perkakas",
    "characteristics": [
      {
        "id": "cls_tl_hand-ch_tool_type",
        "charName": "CH_TOOL_TYPE",
        "label": "Tool Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kunci Ring Pas, Kunci Shock Set, Kunci Pipa, Obeng, Palu"
      },
      {
        "id": "cls_tl_hand-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 19mm, 24mm, 8-32mm, 1/2\" Drive, 24 Inch"
      },
      {
        "id": "cls_tl_hand-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tekiro, Krisbow, Stanley, Ridgid"
      }
    ]
  },
  {
    "className": "CLS_TL_POWER",
    "classType": "001",
    "description": "5. TOOLS · Power & Pneumatic Tools",
    "characteristics": [
      {
        "id": "cls_tl_power-ch_tool_type",
        "charName": "CH_TOOL_TYPE",
        "label": "Tool Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Impact Wrench, Angle Grinder, Mesin Bor, Cut-Off Machine"
      },
      {
        "id": "cls_tl_power-ch_power_type",
        "charName": "CH_POWER_TYPE",
        "label": "Power Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Electric 220V, Pneumatic / Angin, Cordless Battery"
      },
      {
        "id": "cls_tl_power-ch_size_cap",
        "charName": "CH_SIZE_CAP",
        "label": "Size Cap",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 1/2 Inch, 1 Inch, Disc 4 Inch, Disc 14 Inch"
      },
      {
        "id": "cls_tl_power-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Bosch, Makita, Ingersoll Rand, Chicago Pneumatic"
      }
    ]
  },
  {
    "className": "CLS_TL_LIFTING",
    "classType": "001",
    "description": "5. TOOLS · Lifting, Rigging & Shackles",
    "characteristics": [
      {
        "id": "cls_tl_lifting-ch_rig_type",
        "charName": "CH_RIG_TYPE",
        "label": "Rig Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Webbing Sling, Wire Rope Sling, Chain Block, Shackle Omega"
      },
      {
        "id": "cls_tl_lifting-ch_max_load",
        "charName": "CH_MAX_LOAD",
        "label": "Max Load",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 2 Ton, 3 Ton, 5 Ton, 10 Ton"
      },
      {
        "id": "cls_tl_lifting-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Panjang 4m, 6m, 8m, Dia 16mm"
      },
      {
        "id": "cls_tl_lifting-ch_standard",
        "charName": "CH_STANDARD",
        "label": "Standard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: EN 1492-1, Crosby Standard, Sertifikat Migas"
      }
    ]
  },
  {
    "className": "CLS_TL_MEASURE",
    "classType": "001",
    "description": "5. TOOLS · Measuring & Testing Tools",
    "characteristics": [
      {
        "id": "cls_tl_measure-ch_meas_type",
        "charName": "CH_MEAS_TYPE",
        "label": "Meas Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Vernier Caliper, Micrometer, Torque Wrench, Pressure Gauge"
      },
      {
        "id": "cls_tl_measure-ch_range_cap",
        "charName": "CH_RANGE_CAP",
        "label": "Range Cap",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 0-150mm, 0-25mm, 100-500 Nm, 0-400 Bar"
      },
      {
        "id": "cls_tl_measure-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Mitutoyo, Tohnichi, Wika"
      }
    ]
  },
  {
    "className": "CLS_PPE_BODY",
    "classType": "001",
    "description": "7. PERSONAL PROTECTIVE EQUIPMENT · APD Tubuh, Kepala & Kaki",
    "characteristics": [
      {
        "id": "cls_ppe_body-ch_ppe_type",
        "charName": "CH_PPE_TYPE",
        "label": "Ppe Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Safety Shoes, Coverall FRC, Safety Helmet, Safety Glasses, Gloves"
      },
      {
        "id": "cls_ppe_body-ch_size",
        "charName": "CH_SIZE",
        "label": "Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 39, 40, 41, 42, 43, M, L, XL, XXL"
      },
      {
        "id": "cls_ppe_body-ch_color",
        "charName": "CH_COLOR",
        "label": "Color",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Navy Blue, Merah, Kuning, Putih"
      },
      {
        "id": "cls_ppe_body-ch_standard",
        "charName": "CH_STANDARD",
        "label": "Standard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SNI, ANSI Z89.1, NFPA 2112, EN ISO 20345"
      }
    ]
  },
  {
    "className": "CLS_PPE_HEIGHT",
    "classType": "001",
    "description": "7. PERSONAL PROTECTIVE EQUIPMENT · Working at Height",
    "characteristics": [
      {
        "id": "cls_ppe_height-ch_height_type",
        "charName": "CH_HEIGHT_TYPE",
        "label": "Height Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Full Body Harness, Double Lanyard Absorber, Retractable Lifeline"
      },
      {
        "id": "cls_ppe_height-ch_hook_type",
        "charName": "CH_HOOK_TYPE",
        "label": "Hook Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Big Hook / Scaffolding Hook, Carabiner"
      },
      {
        "id": "cls_ppe_height-ch_standard",
        "charName": "CH_STANDARD",
        "label": "Standard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: EN 361, EN 355, ANSI Z359.11"
      }
    ]
  },
  {
    "className": "CLS_PPE_FIRE",
    "classType": "001",
    "description": "7. PERSONAL PROTECTIVE EQUIPMENT · Fire Protection & Spill Kit",
    "characteristics": [
      {
        "id": "cls_ppe_fire-ch_fire_type",
        "charName": "CH_FIRE_TYPE",
        "label": "Fire Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: APAR Dry Powder, APAR CO2, Oil Spill Kit, Fire Blanket"
      },
      {
        "id": "cls_ppe_fire-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 3 kg, 6 kg, 9 kg, 25 kg Trolley, 50 Liter"
      },
      {
        "id": "cls_ppe_fire-ch_standard",
        "charName": "CH_STANDARD",
        "label": "Standard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: SNI, NFPA 10, Standar HSE PHR"
      }
    ]
  },
  {
    "className": "CLS_PPE_GAS",
    "classType": "001",
    "description": "7. PERSONAL PROTECTIVE EQUIPMENT · Gas Detector & Safety Signs",
    "characteristics": [
      {
        "id": "cls_ppe_gas-ch_det_type",
        "charName": "CH_DET_TYPE",
        "label": "Det Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Portable Multi Gas Detector, Single Gas H2S, LOTO Padlock"
      },
      {
        "id": "cls_ppe_gas-ch_gas_type",
        "charName": "CH_GAS_TYPE",
        "label": "Gas Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 4-Gas: H2S, CO, O2, LEL"
      },
      {
        "id": "cls_ppe_gas-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: BW Honeywell, MSA Altair, Dräger"
      }
    ]
  },
  {
    "className": "CLS_PPE_MEDICAL",
    "classType": "001",
    "description": "7. PERSONAL PROTECTIVE EQUIPMENT · Obat-Obatan & P3K",
    "characteristics": [
      {
        "id": "cls_ppe_medical-ch_med_type",
        "charName": "CH_MED_TYPE",
        "label": "Med Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kotak P3K Lengkap, Betadine, Perban Gulung, Kasa Steril, Obat Umum"
      },
      {
        "id": "cls_ppe_medical-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tipe A 25 Org, Tipe B 50 Org, Botol 60ml, Roll 10cm"
      }
    ]
  },
  {
    "className": "CLS_MAT_PLATE",
    "classType": "001",
    "description": "9. MATERIAL · Steel Plate & Structural",
    "characteristics": [
      {
        "id": "cls_mat_plate-ch_mat_form",
        "charName": "CH_MAT_FORM",
        "label": "Mat Form",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Steel Plate, Checkered Plate / Bordes, Besi WF, H-Beam, Siku"
      },
      {
        "id": "cls_mat_plate-ch_mat_grade",
        "charName": "CH_MAT_GRADE",
        "label": "Mat Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: ASTM A36, SS400, Hardox 400"
      },
      {
        "id": "cls_mat_plate-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tebal 4mm/6mm/10mm x 4ft x 8ft, WF 200x100x6m"
      }
    ]
  },
  {
    "className": "CLS_MAT_PIPE",
    "classType": "001",
    "description": "9. MATERIAL · Pipe, Elbow & Fittings",
    "characteristics": [
      {
        "id": "cls_mat_pipe-ch_pipe_form",
        "charName": "CH_PIPE_FORM",
        "label": "Pipe Form",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pipe Seamless, Pipe ERW, Elbow 90°, Flange WN/SO, Tee"
      },
      {
        "id": "cls_mat_pipe-ch_mat_grade",
        "charName": "CH_MAT_GRADE",
        "label": "Mat Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Carbon Steel API 5L Gr.B, ASTM A106, Galvanized"
      },
      {
        "id": "cls_mat_pipe-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 2 Inch, 4 Inch, 6 Inch, 8 Inch, Sch 40, Sch 80, Class 150#"
      }
    ]
  },
  {
    "className": "CLS_MAT_SCAFFOLD",
    "classType": "001",
    "description": "9. MATERIAL · Scaffolding & Accessories",
    "characteristics": [
      {
        "id": "cls_mat_scaffold-ch_scaf_type",
        "charName": "CH_SCAF_TYPE",
        "label": "Scaf Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Pipa Scaffolding, Swivel Clamp, Fixed Clamp, Catwalk, Jack Base"
      },
      {
        "id": "cls_mat_scaffold-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Dia 1.5 Inch x 6m, 1.5 Inch x 4m, 400x25cm"
      },
      {
        "id": "cls_mat_scaffold-ch_standard",
        "charName": "CH_STANDARD",
        "label": "Standard",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: BS 1139, JIS G3444 Galvanized"
      }
    ]
  },
  {
    "className": "CLS_MAT_WELDING",
    "classType": "001",
    "description": "9. MATERIAL · Welding Electrodes & Cons.",
    "characteristics": [
      {
        "id": "cls_mat_welding-ch_weld_type",
        "charName": "CH_WELD_TYPE",
        "label": "Weld Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kawat Las / Electrode, Batu Gerinda Potong/Poles, Kawat Mig"
      },
      {
        "id": "cls_mat_welding-ch_aws_spec",
        "charName": "CH_AWS_SPEC",
        "label": "Aws Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: AWS E7018, AWS E6013, AWS E6010"
      },
      {
        "id": "cls_mat_welding-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Dia 2.6mm, 3.2mm, 4.0mm, 4 Inch, 7 Inch"
      },
      {
        "id": "cls_mat_welding-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Box 5 kg, Kaleng 20 kg, Box 25 pcs"
      }
    ]
  },
  {
    "className": "CLS_LAB_TEST",
    "classType": "001",
    "description": "20. LABORATORIUM EQUIPMENT · Alat Uji Lab & NDT",
    "characteristics": [
      {
        "id": "cls_lab_test-ch_lab_type",
        "charName": "CH_LAB_TYPE",
        "label": "Lab Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Sand Cone Test Set, CBR Test, DCP, Ultrasonic Thickness Gauge"
      },
      {
        "id": "cls_lab_test-ch_test_std",
        "charName": "CH_TEST_STD",
        "label": "Test Std",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: ASTM D1556, SNI, API"
      },
      {
        "id": "cls_lab_test-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Controls, Humboldt, Olympus"
      }
    ]
  },
  {
    "className": "CLS_MECH_GENSET",
    "classType": "001",
    "description": "12. MECHANICAL EQUIPMENT · Unit Genset",
    "characteristics": [
      {
        "id": "cls_mech_genset-ch_gen_type",
        "charName": "CH_GEN_TYPE",
        "label": "Gen Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Silent Type, Open Type, Trailer Mounted"
      },
      {
        "id": "cls_mech_genset-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 20 kVA, 50 kVA, 100 kVA, 250 kVA"
      },
      {
        "id": "cls_mech_genset-ch_phase",
        "charName": "CH_PHASE",
        "label": "Phase",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 1 Phase 220V, 3 Phase 380V"
      },
      {
        "id": "cls_mech_genset-ch_eng_brand",
        "charName": "CH_ENG_BRAND",
        "label": "Eng Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Perkins, Cummins, Yanmar, Denyo"
      }
    ]
  },
  {
    "className": "CLS_MECH_WELDER",
    "classType": "001",
    "description": "12. MECHANICAL EQUIPMENT · Welding Machine, Pump & Comp.",
    "characteristics": [
      {
        "id": "cls_mech_welder-ch_mech_type",
        "charName": "CH_MECH_TYPE",
        "label": "Mech Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Welding Machine Diesel, Inverter Welder, Air Compressor, Water Pump"
      },
      {
        "id": "cls_mech_welder-ch_power_type",
        "charName": "CH_POWER_TYPE",
        "label": "Power Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Diesel Engine, Electric 220V/380V"
      },
      {
        "id": "cls_mech_welder-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 300A, 400A, 10 Bar, 3 Inch, 4 Inch"
      },
      {
        "id": "cls_mech_welder-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Denyo, Miller, Lincoln, Atlas Copco"
      }
    ]
  },
  {
    "className": "CLS_ELEC_APPL",
    "classType": "001",
    "description": "13. ELECTRICAL EQUIPMENT · Home & Mess Appliances",
    "characteristics": [
      {
        "id": "cls_elec_appl-ch_appl_type",
        "charName": "CH_APPL_TYPE",
        "label": "Appl Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: AC Split, Mesin Cuci, Kulkas, Dispenser Air, Water Heater"
      },
      {
        "id": "cls_elec_appl-ch_capacity",
        "charName": "CH_CAPACITY",
        "label": "Capacity",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 1 PK, 1.5 PK, 2 PK, 8 kg, 2 Pintu"
      },
      {
        "id": "cls_elec_appl-ch_spec_volt",
        "charName": "CH_SPEC_VOLT",
        "label": "Spec Volt",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 220V 1-Phase, Low Watt / Inverter"
      },
      {
        "id": "cls_elec_appl-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Daikin, Panasonic, Sharp, LG"
      }
    ]
  },
  {
    "className": "CLS_ELEC_COMP",
    "classType": "001",
    "description": "13. ELECTRICAL EQUIPMENT · Kabel, MCB, Lampu & Panel",
    "characteristics": [
      {
        "id": "cls_elec_comp-ch_comp_type",
        "charName": "CH_COMP_TYPE",
        "label": "Comp Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kabel NYY/NYM, MCB/MCCB, Lampu Sorot LED, Stop Kontak"
      },
      {
        "id": "cls_elec_comp-ch_spec_volt",
        "charName": "CH_SPEC_VOLT",
        "label": "Spec Volt",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 3x2.5mm, 4x16mm, 32A 3P, 100W 220V"
      },
      {
        "id": "cls_elec_comp-ch_protection",
        "charName": "CH_PROTECTION",
        "label": "Protection",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: IP65 Outdoor, Explosion Proof Ex-d, Indoor"
      },
      {
        "id": "cls_elec_comp-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Schneider, Supreme, Philips"
      }
    ]
  },
  {
    "className": "CLS_IT_COMPUTER",
    "classType": "001",
    "description": "14. IT EQUIPMENT · Laptop, PC & Monitor",
    "characteristics": [
      {
        "id": "cls_it_computer-ch_it_type",
        "charName": "CH_IT_TYPE",
        "label": "It Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Laptop Business, PC Desktop, Monitor LED"
      },
      {
        "id": "cls_it_computer-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Lenovo, Dell, HP, Asus"
      },
      {
        "id": "cls_it_computer-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: ThinkPad T14, Latitude 5430, OptiPlex"
      },
      {
        "id": "cls_it_computer-ch_spec_main",
        "charName": "CH_SPEC_MAIN",
        "label": "Spec Main",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Core i5/16GB/512GB SSD, Core i7/16GB/1TB SSD"
      }
    ]
  },
  {
    "className": "CLS_IT_PRINTER",
    "classType": "001",
    "description": "14. IT EQUIPMENT · Printer, Scanner & Proyektor",
    "characteristics": [
      {
        "id": "cls_it_printer-ch_prt_type",
        "charName": "CH_PRT_TYPE",
        "label": "Prt Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Printer Inkjet Tank, Printer Laserjet, Scanner, Proyektor"
      },
      {
        "id": "cls_it_printer-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Epson, HP, Brother, Canon"
      },
      {
        "id": "cls_it_printer-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: L3210, L14150 A3, LaserJet M404dn"
      },
      {
        "id": "cls_it_printer-ch_func_spec",
        "charName": "CH_FUNC_SPEC",
        "label": "Func Spec",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Print/Scan/Copy WiFi, Monochrome, Color"
      }
    ]
  },
  {
    "className": "CLS_IT_RADIO",
    "classType": "001",
    "description": "14. IT EQUIPMENT · Handy Talky (HT) & Network",
    "characteristics": [
      {
        "id": "cls_it_radio-ch_com_type",
        "charName": "CH_COM_TYPE",
        "label": "Com Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Handy Talky / HT, Radio Rig Kendaraan, Router, Starlink"
      },
      {
        "id": "cls_it_radio-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Motorola, Icom, Kenwood, Ubiquiti"
      },
      {
        "id": "cls_it_radio-ch_model",
        "charName": "CH_MODEL",
        "label": "Model",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: XiR P3688, XiR M3688, IC-V80"
      },
      {
        "id": "cls_it_radio-ch_freq_band",
        "charName": "CH_FREQ_BAND",
        "label": "Freq Band",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: UHF 403-470 MHz, VHF 136-174 MHz"
      }
    ]
  },
  {
    "className": "CLS_OFF_ATK",
    "classType": "001",
    "description": "15. OFFICE INVENTORY · Alat Tulis Kantor (ATK)",
    "characteristics": [
      {
        "id": "cls_off_atk-ch_atk_type",
        "charName": "CH_ATK_TYPE",
        "label": "Atk Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kertas HVS, Pulpen, Spidol, Ordner, Map, Lakban"
      },
      {
        "id": "cls_off_atk-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: A4 70gsm, A4 80gsm, F4 70gsm, 2 Inch"
      },
      {
        "id": "cls_off_atk-ch_color",
        "charName": "CH_COLOR",
        "label": "Color",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: White, Black, Blue, Red"
      },
      {
        "id": "cls_off_atk-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Rim, Box 12 Pcs, Pcs"
      }
    ]
  },
  {
    "className": "CLS_OFF_ITACC",
    "classType": "001",
    "description": "15. OFFICE INVENTORY · IT Accessories & Tinta",
    "characteristics": [
      {
        "id": "cls_off_itacc-ch_acc_type",
        "charName": "CH_ACC_TYPE",
        "label": "Acc Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Tinta Botol, Toner Cartridge, Mouse Wireless, Keyboard, Kabel LAN"
      },
      {
        "id": "cls_off_itacc-ch_compat_mdl",
        "charName": "CH_COMPAT_MDL",
        "label": "Compat Mdl",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Epson 003, HP 85A, Cat6 305m"
      },
      {
        "id": "cls_off_itacc-ch_color",
        "charName": "CH_COLOR",
        "label": "Color",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Black, Cyan, Magenta, Yellow"
      }
    ]
  },
  {
    "className": "CLS_OFF_FURN",
    "classType": "001",
    "description": "15. OFFICE INVENTORY · Office & Camp Furniture",
    "characteristics": [
      {
        "id": "cls_off_furn-ch_furn_type",
        "charName": "CH_FURN_TYPE",
        "label": "Furn Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Meja Kerja, Kursi Kantor, Lemari Arsip Besi, Tempat Tidur Mess"
      },
      {
        "id": "cls_off_furn-ch_mat_grade",
        "charName": "CH_MAT_GRADE",
        "label": "Mat Grade",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Kayu HPL, Besi Plat / Filing Cabinet, Springbed"
      },
      {
        "id": "cls_off_furn-ch_dimension",
        "charName": "CH_DIMENSION",
        "label": "Dimension",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: 120x60x75cm, 180x90x45cm, 90x200cm"
      }
    ]
  },
  {
    "className": "CLS_FNB_DRINK",
    "classType": "001",
    "description": "11. FOOD AND DRINK · Air Mineral & Minuman Pantry",
    "characteristics": [
      {
        "id": "cls_fnb_drink-ch_fnb_type",
        "charName": "CH_FNB_TYPE",
        "label": "Fnb Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Air Mineral Galon, Air Mineral Botol, Air Gelas, Kopi, Teh, Gula"
      },
      {
        "id": "cls_fnb_drink-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Galon 19L, Dus 24x600ml, Dus 48x220ml, Pack 1kg"
      },
      {
        "id": "cls_fnb_drink-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Aqua, Le Minerale, Kapal Api, Gulaku"
      }
    ]
  },
  {
    "className": "CLS_FNB_CLEAN",
    "classType": "001",
    "description": "11. FOOD AND DRINK · Sabun, Odol & Kebersihan",
    "characteristics": [
      {
        "id": "cls_fnb_clean-ch_clean_type",
        "charName": "CH_CLEAN_TYPE",
        "label": "Clean Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Sabun Mandi, Odol/Pasta Gigi, Deterjen Cuci, Cairan Pel, Tisu"
      },
      {
        "id": "cls_fnb_clean-ch_pack_size",
        "charName": "CH_PACK_SIZE",
        "label": "Pack Size",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Batang 85g, Tube 190g, Kantong 1.8kg, Jerigen 5L"
      },
      {
        "id": "cls_fnb_clean-ch_brand",
        "charName": "CH_BRAND",
        "label": "Brand",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Lifebuoy, Pepsodent, Rinso, Super Pell"
      }
    ]
  },
  {
    "className": "CLS_SVC_TECH",
    "classType": "001",
    "description": "21. SERVICES - GENERAL & SUBCON · Jasa Teknis & Subkontraktor",
    "characteristics": [
      {
        "id": "cls_svc_tech-ch_svc_type",
        "charName": "CH_SVC_TYPE",
        "label": "Svc Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Overhaul/Repair Bengkel Luar, Kalibrasi Alat, Refill APAR, Subcon Sipil"
      },
      {
        "id": "cls_svc_tech-ch_equip_app",
        "charName": "CH_EQUIP_APP",
        "label": "Equip App",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Excavator PC200, Dump Truck, Gas Detector, APAR 6kg"
      },
      {
        "id": "cls_svc_tech-ch_unit_basis",
        "charName": "CH_UNIT_BASIS",
        "label": "Unit Basis",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Lot, Unit, Tabung, LS"
      }
    ]
  },
  {
    "className": "CLS_SVC_HSE",
    "classType": "001",
    "description": "22. HSE, MEDICAL & INSURANCE · Asuransi, MCU & Training",
    "characteristics": [
      {
        "id": "cls_svc_hse-ch_svc_type",
        "charName": "CH_SVC_TYPE",
        "label": "Svc Type",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Asuransi All-Risk Unit, Asuransi CGL, Medical Check Up, Training SIO"
      },
      {
        "id": "cls_svc_hse-ch_scope",
        "charName": "CH_SCOPE",
        "label": "Scope",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Paket MCU Migas PHR, Sertifikasi Kemnaker, Cover 1 Tahun"
      },
      {
        "id": "cls_svc_hse-ch_unit_basis",
        "charName": "CH_UNIT_BASIS",
        "label": "Unit Basis",
        "dataType": "text",
        "required": false,
        "helpText": "Contoh: Unit/Tahun, Orang/Paket"
      }
    ]
  }
];
