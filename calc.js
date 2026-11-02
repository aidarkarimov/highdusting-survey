// Pure estimate calculation. a = answers object, r = rates.
// Returns { lines, labour, total, low, high, tax, flags, unknowns, suggestedDays }.

const PRICE_KEYS = ['heightMax', 'dustLevel', 'dustType', 'density', 'obstacles', 'clientLift', 'liftType',
  'protection', 'window', 'activeSite', 'hepa', 'combustible', 'travel'];

const COMBUSTIBLE_TYPES = ['food', 'wood', 'metal', 'chemical'];

function heightBand(h) {
  if (!h) return null;
  if (h <= 12) return 'lt12';
  if (h <= 20) return 'h12_20';
  if (h <= 30) return 'h20_30';
  if (h <= 40) return 'h30_40';
  return 'h40p';
}

function num(x) { const n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
function isOn(q) { return q && q.on; }

function calcEstimate(a, r, lang) {
  const L = (pair) => (Array.isArray(pair) ? pair[1] : pair);
  const lines = [];
  const flags = [];
  const add = (label, amount, note) => { if (amount) lines.push({ label, amount: Math.round(amount), note }); };

  const area = num(a.areaScope) || num(a.areaTotal);
  const h = num(a.heightMax);
  const band = heightBand(h);
  const hm = band ? r.height[band] : 1;
  const dm = r.dust[a.dustLevel] || 1;
  const om = r.obstacles[a.obstacles] || 1;
  const labourMult = hm * dm * om;
  const multNote = `×${labourMult.toFixed(2)} (${L('height')} ${hm}, ${L('dust')} ${dm}, ${L('obstacles')} ${om})`;

  // 1. Labour
  if (isOn(a.structure)) {
    const dens = r.density[a.density] || 1;
    if (!area) flags.push({ level: 'warn', text: L('Structure selected but area is empty') });
    add(L('Beams, joists, deck') + ` · ${area.toLocaleString()} sq ft`,
      area * r.baseSqft * dens * labourMult, `$${r.baseSqft}/sq ft × ${L('density')} ${dens} ${multNote}`);
  }
  for (const sec of CHECKLIST) for (const it of sec.items) {
    if (it.type !== 'qty' || !it.rate) continue;
    const q = a[it.id];
    if (!isOn(q)) continue;
    const qty = num(q.qty);
    if (!qty) { flags.push({ level: 'warn', text: L('Missing quantity: ') + L(it.label) }); continue; }
    const rate = r.items[it.rate];
    add(`${L(it.label)} · ${qty} ${Array.isArray(it.unit) ? L(it.unit) : it.unit}`, qty * rate * labourMult, `$${rate} ${multNote}`);
  }
  const labour = lines.reduce((s, l) => s + l.amount, 0);

  // 2. Surcharges (percent of labour)
  const pctLines = [];
  const pct = (label, p) => { if (p && labour) pctLines.push({ label: `${label} +${p}%`, amount: Math.round(labour * p / 100) }); };
  const isFood = a.facilityType === 'food' || a.gmp === 'yes' || (a.below || []).includes('openfood');
  if (a.hepa === 'yes' || isFood) pct(L('HEPA method'), r.pct.hepa);
  if (isFood) pct(L('Food facility (GMP, protection, reporting)'), r.pct.food);
  if (a.activeSite === 'yes') pct(L('Active site'), r.pct.active);
  if (a.protection === 'partial') pct(L('Partial protection'), r.pct.protectPartial);
  if (a.protection === 'full') pct(L('Full protection'), r.pct.protectFull);
  if (a.floorType === 'coated' || a.floorType === 'gym') pct(L('Floor protection'), r.pct.floorProtect);
  const winPct = { evening: r.pct.evening, night: r.pct.night, weekend: r.pct.weekend, shutdown: r.pct.shutdown }[a.window];
  if (winPct) pct(L('Off-hours work'), winPct);
  const combustible = a.combustible === 'yes' || COMBUSTIBLE_TYPES.includes(a.dustType);
  if (combustible) {
    pct(L('Reserve: combustible dust'), r.pct.combustible);
    flags.push({ level: 'stop', text: L('Possible combustible dust. Final price only after a separate assessment (NFPA 652 / DHA)') });
  }
  lines.push(...pctLines);

  // 3. Equipment
  const prodKey = !band || ['lt12', 'h12_20'].includes(band) ? 'low' : band === 'h20_30' ? 'mid' : 'high';
  const liftCount = Math.max(1, Math.round(num(a.liftCount)) || 1);
  const scopeArea = isOn(a.structure) ? area : Math.max(area * 0.4, 0);
  const suggestedDays = Math.max(1, Math.ceil((scopeArea || 1) / r.productivity[prodKey] / liftCount));
  const days = num(a.liftDays) || suggestedDays;
  const needLift = ['scissor', 'boom', 'both'].includes(a.liftType);
  if (needLift && a.clientLift !== 'yes') {
    const types = a.liftType === 'both' ? ['scissor', 'boom'] : [a.liftType];
    for (const t of types) {
      const day = t === 'scissor' ? r.scissorDay : r.boomDay;
      const name = t === 'scissor' ? L('Scissor lift') : L('Boom lift');
      add(`${name} · ${liftCount} × ${days} ${L('days')}`, day * liftCount * days, `$${day}/${L('day')}`);
      add(`${L('Delivery')}: ${name.toLowerCase()} × ${liftCount}`, r.liftDelivery * liftCount);
    }
  }
  if (!a.liftType && h >= 14) flags.push({ level: 'warn', text: L('Height 14 ft+: choose equipment under "Access"') });
  if (a.liftType === 'ladder' && h > 14) flags.push({ level: 'warn', text: L('Ladders above 14 ft: check safety') });
  if (num(a.aisleWidth) && num(a.aisleWidth) < 4 && needLift) flags.push({ level: 'warn', text: L('Narrow aisles (<4 ft): lift may not fit') });

  // 4. Travel & visits
  const visits = Math.max(1, Math.round(num(a.visits)) || 1);
  add(L('Travel / mobilisation'), (r.travel[a.travel] || 0) * visits);
  if (visits > 1) add(L('Extra visits') + ` · ${visits - 1}`, r.extraVisit * (visits - 1));

  // 5. Discount, minimum
  let subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const disc = Math.min(num(a.discount), 50);
  if (disc && subtotal) { const d = Math.round(subtotal * disc / 100); lines.push({ label: L('Discount') + ` −${disc}%`, amount: -d }); subtotal -= d; }
  let total = subtotal;
  if (total > 0 && total < r.minimum) {
    lines.push({ label: L('Minimum job adjustment'), amount: r.minimum - total });
    total = r.minimum;
  }

  // 6. Range by uncertainty
  const unknowns = PRICE_KEYS.filter(k => a[k] === undefined || a[k] === '' || a[k] === 'unknown');
  const widen = Math.min(unknowns.length * r.unknownWiden, 0.3);
  const low = total ? Math.max(r.minimum, Math.round(total * r.rangeLow / 10) * 10) : 0;
  const high = Math.round(total * (r.rangeHigh + widen) / 10) * 10;

  // 7. Other flags
  if (a.birds === 'yes') flags.push({ level: 'stop', text: L('Bird droppings / rodents: biohazard, separate method and PPE') });
  if (a.asbestos === 'yes') flags.push({ level: 'stop', text: L('Suspected asbestos / lead: do not start without testing') });
  if (a.sprinklers === 'yes') flags.push({ level: 'info', text: L('Sprinklers: do not touch heads, brief the crew') });
  if (a.fireAlarm === 'yes') flags.push({ level: 'info', text: L('Smoke detectors: coordinate alarm bypass with client') });
  if (a.moisture === 'yes') flags.push({ level: 'info', text: L('Moisture: dust may be caked, check method') });
  if (a.decisionMaker === 'no') flags.push({ level: 'info', text: L('Contact is not the decision-maker: find who approves') });
  if (num(a.budget) && num(a.budget) < low) flags.push({ level: 'warn', text: L('Client budget is below range: discuss reducing scope') });

  const prov = (CITIES.find(c => c.v === a.city) || {}).prov || '';
  const taxRate = r.tax[prov] ?? r.tax[''];

  return { lines, labour, total, low, high, taxRate, flags, unknowns, suggestedDays, days };
}

if (typeof module !== 'undefined') module.exports = { calcEstimate, heightBand };
