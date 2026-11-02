// HighDusting site survey: checklist + default rates.
// Every label is [ru, en]. Rates are CAD and editable in Settings.

const YN = [
  { v: 'yes', l: 'Yes' },
  { v: 'no', l: 'No' },
  { v: 'unknown', l: 'Unknown' },
];

const CITIES = [
  { v: 'toronto', l: 'Toronto, ON', prov: 'ON' },
  { v: 'montreal', l: 'Montréal, QC', prov: 'QC' },
  { v: 'vancouver', l: 'Vancouver, BC', prov: 'BC' },
  { v: 'calgary', l: 'Calgary, AB', prov: 'AB' },
  { v: 'halifax', l: 'Halifax, NS', prov: 'NS' },
  { v: 'winnipeg', l: 'Winnipeg, MB', prov: 'MB' },
  { v: 'other', l: 'Other city', prov: '' },
];

// Item types: text, tel, email, date, number, select, multi, yn, qty (toggle + quantity), address, textarea
// important: true → shows in "you forgot to ask" list if empty.
// rate: key in RATES.items → item is priced as qty × rate × labour multiplier.
const CHECKLIST = [
  {
    id: 'site', icon: 'map-pin', title: 'Site & client',
    items: [
      { id: 'address', type: 'address', label: 'Site address', important: true },
      { id: 'city', type: 'select', label: 'City / region', options: CITIES, important: true },
      { id: 'clientName', type: 'text', label: 'Client company', important: true },
      { id: 'contactName', type: 'text', label: 'Contact person', important: true },
      { id: 'contactPhone', type: 'tel', label: 'Phone' },
      { id: 'contactEmail', type: 'email', label: ['Email', 'Email'], important: true },
      { id: 'decisionMaker', type: 'yn', label: 'Is this person the decision-maker?', hint: 'If not, find out who approves and who gets the quote', important: true },
      {
        id: 'facilityType', type: 'select', label: 'Facility type', important: true, options: [
          { v: 'warehouse', l: 'Warehouse / distribution' },
          { v: 'manufacturing', l: 'Manufacturing / industrial' },
          { v: 'food', l: 'Food processing' },
          { v: 'retail', l: 'Retail / commercial' },
          { v: 'office', l: 'Office / loft / restaurant' },
          { v: 'arena', l: 'Arena / gymnasium' },
          { v: 'school', l: 'School / university' },
          { v: 'transport', l: 'Transportation (hangar, depot, terminal)' },
          { v: 'construction', l: 'Post-construction' },
          { v: 'other', l: 'Other' },
        ]
      },
      {
        id: 'reason', type: 'multi', label: 'Why clean now?', hint: 'The trigger tells you the deadline and what matters most', important: true, options: [
          { v: 'inspection', l: 'Inspection / audit (fire, food, insurance)' },
          { v: 'falling', l: 'Dust falling on product / equipment' },
          { v: 'construction', l: 'Construction / renovation finished' },
          { v: 'move', l: 'Move-in / move-out / handover' },
          { v: 'appearance', l: 'Appearance, visitors, event' },
          { v: 'routine', l: 'Routine maintenance' },
          { v: 'other', l: 'Other' },
        ]
      },
      { id: 'deadline', type: 'date', label: 'Needed by (date)' },
      {
        id: 'lastCleaned', type: 'select', label: 'When was overhead last cleaned?', options: [
          { v: 'never', l: 'Never' },
          { v: 'lt1', l: 'Less than 1 year' },
          { v: '1to3', l: '1–3 years' },
          { v: 'gt3', l: 'More than 3 years' },
          { v: 'unknown', l: 'Unknown' },
        ]
      },
    ]
  },
  {
    id: 'size', icon: 'ruler', title: 'Size & height',
    items: [
      { id: 'areaTotal', type: 'number', unit: 'sq ft', label: 'Total building area', important: true },
      { id: 'areaScope', type: 'number', unit: 'sq ft', label: 'Area in scope', hint: 'Leave empty if the whole building is in scope' },
      { id: 'heightMax', type: 'number', unit: 'ft', label: 'Height to deck (max)', hint: 'Use the highest point in the work area', important: true },
      { id: 'zones', type: 'number', label: 'Number of separate zones / rooms' },
      {
        id: 'density', type: 'select', label: 'How busy is the overhead structure', important: true, options: [
          { v: 'sparse', l: 'Sparse: open deck, few members' },
          { v: 'typical', l: 'Typical: joists, some pipes & ducts' },
          { v: 'dense', l: 'Dense: lots of pipes, ducts, trays' },
        ]
      },
      {
        id: 'obstacles', type: 'select', label: 'Floor obstacles (racking, machines)', important: true, options: [
          { v: 'none', l: 'Few, floor is open' },
          { v: 'some', l: 'Some, can work around' },
          { v: 'many', l: 'Many, frequent lift moves' },
        ]
      },
      { id: 'floorPlan', type: 'yn', label: 'Can the client share a floor plan?' },
    ]
  },
  {
    id: 'scope', icon: 'list-checks', title: 'Scope',
    intro: 'Walk the site and mark everything present. If it exists but is excluded, list it under exclusions.',
    items: [
      { id: 'structure', type: 'qty', unit: 'area', label: 'Beams, joists, deck (by area)', hint: 'Priced by the area from "Size"', important: true },
      { id: 'cobwebs', type: 'qty', unit: 'spots', rate: 'cobweb', label: 'Cobwebs', hint: 'Number of spots (corners, windows, fixtures)' },
      { id: 'fixtures', type: 'qty', unit: 'pcs', rate: 'fixture', label: 'Light fixtures' },
      { id: 'fansStd', type: 'qty', unit: 'pcs', rate: 'fanStd', label: 'Standard ceiling fans' },
      { id: 'fansHvls', type: 'qty', unit: 'pcs', rate: 'fanHvls', label: 'Large HVLS fans' },
      { id: 'ducts', type: 'qty', unit: 'lin ft', rate: 'ductLf', label: 'Ductwork exterior' },
      { id: 'pipes', type: 'qty', unit: 'lin ft', rate: 'pipeLf', label: 'Pipes, conduit, cable trays' },
      { id: 'rackTops', type: 'qty', unit: 'lin ft', rate: 'rackLf', label: 'Rack tops' },
      { id: 'baffles', type: 'qty', unit: 'pcs', rate: 'baffle', label: 'Acoustic baffles / clouds' },
      { id: 'hvacUnits', type: 'qty', unit: 'pcs', rate: 'hvacUnit', label: 'Unit heaters / overhead HVAC units' },
      { id: 'signs', type: 'qty', unit: 'pcs', rate: 'sign', label: 'Signs, banners, scoreboards' },
      { id: 'ledges', type: 'qty', unit: 'lin ft', rate: 'ledgeLf', label: 'Ledges, high walls, window sills' },
      { id: 'equipment', type: 'qty', unit: 'pcs', rate: 'equipment', label: 'Equipment exterior' },
      { id: 'sprinklers', type: 'yn', label: 'Sprinkler heads in work area?', hint: 'Heads must not be touched: brief the crew', important: true },
      { id: 'exclusions', type: 'textarea', label: 'Exclusions' },
    ]
  },
  {
    id: 'dust', icon: 'wind', title: 'Dust',
    items: [
      {
        id: 'dustLevel', type: 'select', label: 'Dust level', important: true, options: [
          { v: 'light', l: 'Light: thin film, surface visible' },
          { v: 'moderate', l: 'Moderate: visible layer, finger leaves a mark' },
          { v: 'heavy', l: 'Heavy: thick layer, hanging dust' },
          { v: 'extreme', l: 'Extreme: sticky, greasy, caked' },
        ]
      },
      {
        id: 'dustType', type: 'select', label: 'Dust type', important: true, options: [
          { v: 'ordinary', l: 'Ordinary (warehouse, office)' },
          { v: 'construction', l: 'Construction (drywall, concrete)' },
          { v: 'greasy', l: 'Greasy / oily' },
          { v: 'food', l: 'Food (flour, sugar, starch)' },
          { v: 'wood', l: 'Wood' },
          { v: 'metal', l: 'Metal' },
          { v: 'chemical', l: 'Chemical / plastic / powders' },
          { v: 'unknown', l: 'Unknown' },
        ]
      },
      { id: 'combustible', type: 'yn', label: 'Could the dust be combustible? Does the client have a DHA?', hint: 'Combustible dust requires a separate assessment', important: true },
      { id: 'hepa', type: 'yn', label: 'HEPA extraction required?', important: true },
      { id: 'birds', type: 'yn', label: 'Bird droppings, nests, rodents?', hint: 'Biohazard: PPE and a separate method' },
      { id: 'asbestos', type: 'yn', label: 'Pre-1990 building: possible asbestos or lead paint?' },
      { id: 'moisture', type: 'yn', label: 'Condensation, moisture, rust overhead?' },
    ]
  },
  {
    id: 'access', icon: 'lift', title: 'Access & equipment',
    items: [
      { id: 'clientLift', type: 'yn', label: 'Can we use the client\'s own lift?', important: true },
      {
        id: 'liftType', type: 'select', label: 'Access equipment needed', important: true, options: [
          { v: 'ladder', l: 'Ladders / poles (up to ~14 ft)' },
          { v: 'scissor', l: 'Scissor lift' },
          { v: 'boom', l: 'Boom lift' },
          { v: 'both', l: 'Scissor + boom' },
        ]
      },
      { id: 'liftCount', type: 'number', label: 'Lifts on site at once' },
      { id: 'liftDays', type: 'number', unit: 'days', label: 'Equipment rental days', hint: 'Leave empty to auto-suggest from area and height' },
      { id: 'aisleWidth', type: 'number', unit: 'ft', label: 'Narrowest aisle', hint: 'Scissor needs ~3–4 ft, boom ~6–8 ft', important: true },
      {
        id: 'floorType', type: 'select', label: 'Floor', important: true, options: [
          { v: 'concrete', l: 'Concrete' },
          { v: 'coated', l: 'Epoxy / coated (non-marking tires)' },
          { v: 'gym', l: 'Gym / wood (floor protection)' },
          { v: 'uneven', l: 'Uneven, damaged, sloped' },
          { v: 'tile', l: 'Tile / carpet' },
        ]
      },
      { id: 'floorLoad', type: 'yn', label: 'Mezzanine or floor load limits?' },
      { id: 'doors', type: 'text', label: 'Doors for equipment (W × H)', important: true },
      { id: 'dock', type: 'yn', label: 'Loading dock / drop-off for equipment?' },
      { id: 'power', type: 'yn', label: '120V outlets near work area?' },
      { id: 'parking', type: 'yn', label: 'Parking for crew van?' },
    ]
  },
  {
    id: 'protect', icon: 'shield', title: 'Below & protection',
    items: [
      {
        id: 'below', type: 'multi', label: 'What is below the work area', important: true, options: [
          { v: 'stock', l: 'Stock / packaged goods' },
          { v: 'openfood', l: 'Open food / production lines' },
          { v: 'electronics', l: 'Electronics / servers' },
          { v: 'machines', l: 'Machines / equipment' },
          { v: 'people', l: 'Workstations / people' },
          { v: 'nothing', l: 'Nothing, empty' },
        ]
      },
      {
        id: 'protection', type: 'select', label: 'Covering / protection needed', important: true, options: [
          { v: 'none', l: 'None' },
          { v: 'partial', l: 'Partial (some areas)' },
          { v: 'full', l: 'Full coverage' },
        ]
      },
      {
        id: 'whoMoves', type: 'select', label: 'Who moves stock / equipment', options: [
          { v: 'client', l: 'Client' },
          { v: 'us', l: 'Us' },
          { v: 'none', l: 'Not needed' },
        ]
      },
      { id: 'fireAlarm', type: 'yn', label: 'Smoke detectors in area? Who coordinates the fire alarm?', hint: 'Dust can trigger a false alarm', important: true },
    ]
  },
  {
    id: 'schedule', icon: 'clock', title: 'Schedule',
    items: [
      {
        id: 'window', type: 'select', label: 'Work window', important: true, options: [
          { v: 'day', l: 'Weekday business hours' },
          { v: 'evening', l: 'Evenings' },
          { v: 'night', l: 'Overnight' },
          { v: 'weekend', l: 'Weekends' },
          { v: 'shutdown', l: 'Shutdown / holidays' },
        ]
      },
      { id: 'activeSite', type: 'yn', label: 'Site active during cleaning (people, forklifts)?', important: true },
      { id: 'visits', type: 'number', label: 'Number of visits / phases', hint: 'e.g. phased by zone to avoid disruption' },
      { id: 'noise', type: 'yn', label: 'Noise or time restrictions?' },
      { id: 'dates', type: 'text', label: 'Preferred dates' },
    ]
  },
  {
    id: 'reqs', icon: 'clipboard', title: 'Site requirements',
    items: [
      { id: 'coi', type: 'yn', label: 'Certificate of insurance required? Amount?', important: true },
      { id: 'wsib', type: 'yn', label: 'WSIB / WCB clearance required?' },
      { id: 'orientation', type: 'yn', label: 'Site orientation / induction required?' },
      { id: 'gmp', type: 'yn', label: 'Food rules (GMP, allergens, hairnets)?' },
      { id: 'escort', type: 'yn', label: 'Escort / security passes required?' },
      {
        id: 'travel', type: 'select', label: 'Distance from base', important: true, options: [
          { v: 'local', l: 'Local' },
          { v: 'regional', l: 'Up to 100 km' },
          { v: 'remote', l: 'Over 100 km (overnight)' },
        ]
      },
      { id: 'otherReqs', type: 'textarea', label: 'Other requirements' },
    ]
  },
  {
    id: 'deal', icon: 'file-check', title: 'Frequency & sign-off',
    items: [
      {
        id: 'frequency', type: 'select', label: 'Frequency', important: true, options: [
          { v: 'once', l: 'One-time' },
          { v: 'quarterly', l: 'Quarterly' },
          { v: 'semi', l: 'Semi-annual' },
          { v: 'annual', l: 'Annual' },
        ]
      },
      { id: 'multiSite', type: 'yn', label: 'Other sites for this client?' },
      {
        id: 'acceptance', type: 'select', label: 'How the client signs off', important: true, options: [
          { v: 'walk', l: 'Walk-through with contact' },
          { v: 'photos', l: 'Before / after photos' },
          { v: 'whiteglove', l: 'White-glove inspection' },
          { v: 'audit', l: 'Third-party audit' },
        ]
      },
      { id: 'budget', type: 'number', unit: '$', label: 'Client budget (if shared)' },
      { id: 'competitors', type: 'text', label: 'Comparing other quotes? Whose?' },
      { id: 'discount', type: 'number', unit: '%', label: 'Discount (manual)' },
    ]
  },
];

const PHOTO_PROMPTS = [
  { id: 'overview', l: 'Overall view' },
  { id: 'closeup', l: 'Close-up: dust on a beam' },
  { id: 'ceiling', l: 'Ceiling: pipes, ducts, fixtures' },
  { id: 'aisles', l: 'Aisles and floor' },
  { id: 'doors', l: 'Doors / equipment access' },
  { id: 'below', l: 'What is below (stock, machines)' },
  { id: 'problems', l: 'Problem areas' },
];

// Default market-based rates (CAD). Sources and reasoning: docs/research.md
const DEFAULT_RATES = {
  baseSqft: 0.18,           // structure dusting, per sq ft, labour only, ≤20 ft, moderate dust
  minimum: 750,             // minimum job
  height: { lt12: 0.8, h12_20: 1.0, h20_30: 1.2, h30_40: 1.4, h40p: 1.7 },
  dust: { light: 0.85, moderate: 1.0, heavy: 1.3, extreme: 1.6 },
  density: { sparse: 0.85, typical: 1.0, dense: 1.3 },
  obstacles: { none: 1.0, some: 1.1, many: 1.25 },
  items: {
    cobweb: 12, fixture: 18, fanStd: 35, fanHvls: 150, ductLf: 1.75, pipeLf: 0.9,
    rackLf: 1.25, baffle: 25, hvacUnit: 75, sign: 20, ledgeLf: 0.75, equipment: 150,
  },
  scissorDay: 250, boomDay: 550, liftDelivery: 300,  // delivery+pickup per lift
  productivity: { low: 10000, mid: 7000, high: 5000 },  // sq ft per lift-day: ≤20 ft, 20–30 ft, 30+ ft
  pct: {
    hepa: 15, food: 20, active: 10, protectPartial: 8, protectFull: 18, combustible: 25,
    floorProtect: 5, evening: 15, night: 20, weekend: 25, shutdown: 30,
  },
  travel: { local: 0, regional: 300, remote: 900 },
  extraVisit: 200,
  rangeLow: 0.85, rangeHigh: 1.2, unknownWiden: 0.03,
  tax: { ON: 13, QC: 14.975, BC: 5, AB: 5, NS: 14, MB: 5, '': 13 },
};

const RATE_LABELS = {
  baseSqft: 'Structure dusting, $/sq ft',
  minimum: 'Minimum job, $',
  'height.lt12': 'Height <12 ft, ×',
  'height.h12_20': 'Height 12–20 ft, ×',
  'height.h20_30': 'Height 20–30 ft, ×',
  'height.h30_40': 'Height 30–40 ft, ×',
  'height.h40p': 'Height 40+ ft, ×',
  'dust.light': 'Dust light, ×',
  'dust.moderate': 'Dust moderate, ×',
  'dust.heavy': 'Dust heavy, ×',
  'dust.extreme': 'Dust extreme, ×',
  'density.sparse': 'Structure sparse, ×',
  'density.typical': 'Structure typical, ×',
  'density.dense': 'Structure dense, ×',
  'obstacles.none': 'Obstacles none, ×',
  'obstacles.some': 'Obstacles some, ×',
  'obstacles.many': 'Obstacles many, ×',
  'items.cobweb': 'Cobweb, $/spot',
  'items.fixture': 'Fixture, $/pc',
  'items.fanStd': 'Standard fan, $',
  'items.fanHvls': 'HVLS fan, $',
  'items.ductLf': 'Duct, $/lin ft',
  'items.pipeLf': 'Pipe/tray, $/lin ft',
  'items.rackLf': 'Rack top, $/lin ft',
  'items.baffle': 'Baffle, $',
  'items.hvacUnit': 'HVAC unit, $',
  'items.sign': 'Sign/banner, $',
  'items.ledgeLf': 'Ledge, $/lin ft',
  'items.equipment': 'Equipment exterior, $/pc',
  scissorDay: 'Scissor lift, $/day',
  boomDay: 'Boom lift, $/day',
  liftDelivery: 'Lift delivery round trip, $',
  'productivity.low': 'Output ≤20 ft, sq ft/day',
  'productivity.mid': 'Output 20–30 ft, sq ft/day',
  'productivity.high': 'Output 30+ ft, sq ft/day',
  'pct.hepa': ['HEPA, +%', 'HEPA, +%'],
  'pct.food': 'Food facility, +%',
  'pct.active': 'Active site, +%',
  'pct.protectPartial': 'Partial protection, +%',
  'pct.protectFull': 'Full protection, +%',
  'pct.floorProtect': 'Floor protection, +%',
  'pct.combustible': 'Combustible dust reserve, +%',
  'pct.evening': 'Evening, +%',
  'pct.night': 'Overnight, +%',
  'pct.weekend': 'Weekend, +%',
  'pct.shutdown': 'Shutdown / holiday, +%',
  'travel.local': 'Travel local, $',
  'travel.regional': 'Travel ≤100 km, $',
  'travel.remote': 'Travel >100 km, $',
  extraVisit: 'Each extra visit, $',
  rangeLow: 'Range low, ×',
  rangeHigh: 'Range high, ×',
  unknownWiden: 'Range widening per unknown, ×',
  'tax.ON': 'Tax ON (HST), %',
  'tax.QC': 'Tax QC (GST+QST), %',
  'tax.BC': 'Tax BC, %',
  'tax.AB': 'Tax AB (GST), %',
  'tax.NS': 'Tax NS (HST), %',
  'tax.MB': 'Tax MB, %',
};

// Estimators who can sign in. Each sets their own 4-digit PIN on first sign-in on a device.
const USERS = [
  { id: 'aidar', name: 'Aidar' },
  { id: 'sergey', name: 'Sergey' },
  { id: 'alex', name: 'Alex' },
];
