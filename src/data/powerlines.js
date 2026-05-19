export const POWERLINE_PULL = {
  area: 'Mosman Municipal Council LGA',
  extractedAt: '2026-05-11',
  boundarySource: 'OpenStreetMap/Nominatim administrative boundary for Mosman Municipal Council',
  networkProvider: 'Ausgrid',
  sourceNote:
    'Look Up and Live public layers primarily display overhead electricity network assets. Underground network and service lines are not complete in the public viewer, and the provider warns that data may be up to 12 months old.',
}

export const POWERLINE_SOURCES = [
  {
    label: 'Look Up and Live map',
    url: 'https://lookupandlive.com.au/',
    note: 'Public overhead-network map used for Ausgrid HV, LV, pole, and exclusion-zone counts.',
  },
  {
    label: 'Ausgrid working near powerlines',
    url: 'https://www.ausgrid.com.au/Your-safety/Working-safely-around-the-network/Working-near-powerlines',
    note: 'Ausgrid directs users to Look Up and Live and BYDA for overhead and underground asset checks.',
  },
  {
    label: 'NSW Service and Installation Rules, June 2025',
    url: 'https://www.energy.nsw.gov.au/sites/default/files/2025-06/NSW-Service-and-Installation-Rules.pdf',
    note: 'Current NSW service voltage and service cable sizing rules.',
  },
  {
    label: 'Ausgrid NS238 Supply Quality',
    url: 'https://www.ausgrid.com.au/-/media/Documents/Technical-Documentation/NS/ns238.pdf?hash=C9AC61391301F48E1F6CCE3F5800A244812FC997&la=en',
    note: 'Ausgrid voltage quality limits and typical medium/high-voltage distribution ranges.',
  },
  {
    label: 'Ausgrid NS125 Low Voltage Overhead Mains',
    url: 'https://www.ausgrid.com.au/-/media/Documents/Technical-Documentation/NS/NS125.pdf',
    note: 'Ausgrid LV aerial bundled cable and bare conductor selections.',
  },
  {
    label: 'Ausgrid NS195 High Voltage Customer Connections',
    url: 'https://www.ausgrid.com.au/-/media/Documents/Technical-Documentation/NS/NS195.pdf',
    note: 'Ausgrid nominal HV supply voltage and customer connection advice.',
  },
  {
    label: 'Geoscience Australia National Electricity Infrastructure',
    url: 'https://services.ga.gov.au/gis/rest/services/National_Electricity_Infrastructure/MapServer',
    note: 'Transmission line and transmission/zone substation reference layer.',
  },
]

export const MOSMAN_POWERLINE_SUMMARY = [
  {
    id: 'hv-overhead',
    label: 'HV overhead spans',
    value: 36,
    unit: 'segments',
    voltage: 'Public layer labels as high voltage; Ausgrid distribution HV is typically 11 kV, 22 kV, 33 kV, 66 kV, or 132 kV depending on location.',
    sourceLayer: 'LUAL_Network_HV_Feature_Public',
    refreshed: '2025-06-19',
  },
  {
    id: 'lv-overhead',
    label: 'LV overhead network',
    value: 2747,
    unit: 'segments',
    voltage: 'Low voltage distribution, nominal 230/400 V.',
    sourceLayer: 'LUAL_Network_LV_Slave',
    refreshed: '2025-06-19',
  },
  {
    id: 'service-overhead',
    label: 'Overhead services',
    value: 4826,
    unit: 'segments',
    voltage: 'Customer service connections, nominal 230/400 V.',
    sourceLayer: 'LUAL_Network_LV_Slave',
    refreshed: '2025-06-19',
  },
  {
    id: 'streetlight-overhead',
    label: 'Streetlight overhead',
    value: 533,
    unit: 'segments',
    voltage: 'Public lighting/service category in LV layer.',
    sourceLayer: 'LUAL_Network_LV_Slave',
    refreshed: '2025-06-19',
  },
  {
    id: 'poles',
    label: 'Ausgrid poles',
    value: 3367,
    unit: 'assets',
    voltage: 'Includes LV, streetlight standards, and other pole classifications where published.',
    sourceLayer: 'LUAL_Poles_Feature_Public',
    refreshed: '2025-07-21',
  },
  {
    id: 'exclusion-zones',
    label: 'Public exclusion-zone records',
    value: 783,
    unit: 'records',
    voltage: 'Safety planning overlay tied to overhead assets.',
    sourceLayer: 'LUAL_Exclusion_Zone_Feature_Public',
    refreshed: '2025-06-19',
  },
]

export const TRANSMISSION_ASSETS = [
  {
    id: 'lane-cove-dalley-st',
    type: 'Transmission line',
    name: 'Lane Cove to Dalley St',
    construction: 'Underground',
    status: 'Operational',
    voltage: '132 kV',
    note: 'Intersects the broader Mosman planning search envelope; Geoscience Australia spatial confidence is low for this line.',
  },
  {
    id: 'mosman-zone-substation',
    type: 'Zone substation',
    name: 'Mosman',
    construction: 'Substation',
    status: 'Operational',
    voltage: '132 kV',
    note: 'GA National Electricity Infrastructure layer identifies a Mosman 132 kV zone substation.',
  },
]

export const VOLTAGE_LIMITS = [
  {
    band: 'LV supply',
    nominal: '230/400 V AC, 50 Hz',
    allowed: '216 V to 253 V phase-to-neutral at connection points under normal operating conditions',
    source: 'Ausgrid NS238 / AS 60038 tolerance of +10% / -6%',
  },
  {
    band: 'Ausgrid nominal HV customer supply',
    nominal: '11 kV',
    allowed: 'Normally 10.3 kV to 11.8 kV',
    source: 'Ausgrid NS195 High Voltage Customer Connections',
  },
  {
    band: 'Medium/high-voltage distribution',
    nominal: 'Typically 11 kV, 22 kV, 33 kV, 66 kV, and 132 kV',
    allowed: 'Location-specific; Ausgrid must confirm the network operating objective before project commitments',
    source: 'Ausgrid NS238 and NS195',
  },
]

export const SERVICE_SIZING = {
  underground: [
    { cable: '16 mm2 Cu', cores: '1 or 4', rating: '100 A' },
    { cable: '25 mm2 Cu', cores: '1 or 4', rating: '100 A' },
    { cable: '50 mm2 Cu', cores: '1 or 4', rating: '200 A' },
    { cable: '70 mm2 Cu', cores: '1 or 4', rating: '200 A' },
    { cable: '240 mm2 Al', cores: '4', rating: '400 A' },
  ],
  overhead: [
    { cable: '25 mm2 Al', cores: '1 twin or 4 core', rating: '100 A' },
    { cable: '95 mm2 Al', cores: '1 x 4 core', rating: '200 A' },
    { cable: '2 x 95 mm2 Al', cores: '2 x 4 core', rating: '400 A' },
  ],
  lvOverheadMains: [
    '2 x 25 mm2 LV ABC',
    '2 x 95 mm2 LV ABC',
    '4 x 25 mm2 LV ABC',
    '4 x 95 mm2 LV ABC',
    '4 x 150 mm2 LV ABC',
    'Selected bare conductors include AAC Mercury/Pluto and ACSR Apple/Cherry/Raisin families.',
  ],
}
