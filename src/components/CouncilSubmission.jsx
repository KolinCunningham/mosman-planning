const SURVEY = [
  { q: 'What do you value most about Mosman?', a: 'Natural environment / open space · Village-feel' },
  { q: 'Top three principles', a: 'Protect and enhance established character · Advocate for community needs and infrastructure · Leverage value to deliver opportunities for all' },
  { q: 'Preferred development option', a: 'Option 2 — High and Narrow' },
  { q: 'Relationship to Mosman', a: 'Resident — Mosman Bay' },
  { q: 'Age group', a: '35–49' },
  { q: 'Submitted by', a: 'Kolin Cunningham · 17 May 2026' },
]

const MISSING = [
  {
    title: 'Transport & traffic infrastructure',
    tag: 'Missing principle',
    tagColor: 'bg-red-100 text-red-700',
    problem: 'Military Road is already at capacity. The masterplan commits to housing targets but leaves congestion mitigation optional. Buses are not a solution — they share the same road and bridge. Northern Beaches growth (Frenchs Forest hospital precinct alone adds tens of thousands) will increase through-traffic independent of any local action.',
    solutions: [
      {
        label: 'Overhead bypass / second harbour crossing',
        detail: 'Dedicated bypass takes Northern Beaches through-traffic over or around the Mosman village centre. State Government responsibility — but the density uplift provides the political justification. Council should formally advocate for this as part of the masterplan.',
      },
      {
        label: 'Tidal (reversible) one-way system',
        detail: 'Ourimbah Rd → Macpherson St → Gerard St → Belgrave St → Ernest St forms a parallel route. Direction-switched: inbound AM peak, outbound PM. Proven technique (Sydney Harbour Bridge uses tidal lane allocation). Requires signage and signal coordination — no new road infrastructure.',
      },
    ],
    principle: 'Transport infrastructure — road capacity, active travel, pedestrian connections — must be planned and funded ahead of or concurrent with new development. Council must formally advocate to the State for bypass infrastructure serving the Northern Beaches corridor.',
  },
  {
    title: 'Energy & utility infrastructure',
    tag: 'Missing principle',
    tagColor: 'bg-orange-100 text-orange-700',
    problem: 'Mosman\'s overhead electricity network was designed for low-density residential load. 4,700 new dwellings with EVs, reverse-cycle AC, and induction cooktops represent a step-change in demand. No principle requires Ausgrid network capacity to be confirmed or upgraded as a prerequisite for development approval.',
    solutions: [
      {
        label: 'Utility capacity as a prerequisite',
        detail: 'No development approval in the Option 2 zone should be granted without Ausgrid confirming network capacity or committing to upgrade. Electricity, water, stormwater, and telco infrastructure must be upgraded to meet new demand.',
      },
      {
        label: 'Overhead undergrounding in renewal areas',
        detail: 'Required as a condition of major approvals in the renewal corridor. Improves streetscape character, reduces bushfire risk, removes visual amenity problem that worsens as building heights increase.',
      },
    ],
    principle: 'Utility infrastructure capacity must be confirmed and upgraded before density approvals are granted. Overhead network undergrounding should be prioritised in renewal areas.',
  },
]

const OTHER_GAPS = [
  {
    title: 'Climate resilience',
    detail: 'Principle 5 protects existing environment but does not require new development to perform against heat, flooding, or net-zero standards. Density uplift increases impervious surface and urban heat. Needs a measurable standard, not a value statement.',
  },
  {
    title: 'Economic vitality of centres',
    detail: 'No principle protects active ground-floor uses at Spit Junction and Military Road. Without it, the framework will permit all-residential development that meets housing targets but hollows out street life.',
  },
  {
    title: 'Affordable housing diversity',
    detail: 'Buried inside "Leverage value for all." Given the scale of new supply, it deserves its own principle with explicit targets for social, affordable, and key worker housing.',
  },
]

const OPTION2 = [
  {
    title: 'Why Option 2 is preferred',
    points: [
      'Concentrating density near Spit Junction reduces car trips — residents walk to services rather than driving onto Military Road.',
      'Option 1\'s broader footprint creates more car-dependent households funnelling onto the same bottleneck. It distributes the traffic problem less efficiently.',
      'Smaller 60-hectare footprint makes infrastructure delivery tractable — Ausgrid upgrades, stormwater, water mains can be planned for a defined zone.',
      'Scores better on heritage conservation, scenic protection, and mature tree retention because less land is affected.',
    ],
  },
  {
    title: 'Conditions for Option 2 to succeed',
    points: [
      '28-storey buildings should not be permitted by right. Maximum height must be conditional on demonstrated public benefit — open space, through-site pedestrian links, affordable housing in perpetuity, or ground-floor retail activation.',
      'Council must formally advocate to the State for bypass infrastructure. More buses are not sufficient.',
      'A tidal one-way system on the Ourimbah Rd corridor should be investigated immediately.',
      'No development approval in the Option 2 zone without Ausgrid confirming capacity or committing to upgrade.',
      'Overhead undergrounding required as a condition of major approvals in the renewal corridor.',
    ],
  },
]

const TAX = {
  title: 'Federal tax reform creates a closing window',
  points: [
    'From 1 July 2027, negative gearing restricted to new builds only — existing properties purchased after 12 May 2026 can no longer be negatively geared against salary income.',
    'New apartments built in Mosman\'s Option 2 corridor will attract significantly better tax treatment than buying established housing anywhere in Sydney.',
    'Gains accrued before 1 July 2027 still attract the 50% CGT discount. The window to sell into a rezoning uplift at the most favourable tax rate is limited.',
    'Getting Option 2 gazetted and planning agreements in place before that window closes is a material financial consideration for the community.',
    'Done correctly — with infrastructure locked in, height tied to public benefit, and affordable housing secured through binding planning agreements — this masterplan positions Mosman to capture genuine long-term value while the federal settings are aligned to deliver it.',
  ],
}

function Tag({ children, className }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

export default function CouncilSubmission() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mosman Masterplan Consultation</h2>
        <p className="text-sm text-slate-500 mt-1">
          Council submission by Kolin Cunningham — submitted 17 May 2026 · Consultation closes 19 May 2026
        </p>
      </div>

      {/* Survey responses */}
      <Card>
        <h3 className="font-bold text-slate-800 mb-4">Survey responses</h3>
        <dl className="divide-y divide-slate-100">
          {SURVEY.map(({ q, a }) => (
            <div key={q} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm text-slate-500 font-medium">{q}</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2 text-sm text-slate-800 font-semibold">{a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Missing principles */}
      <div>
        <h3 className="font-bold text-slate-800 mb-1 text-lg">Missing masterplan principles</h3>
        <p className="text-sm text-slate-500 mb-4">Two principles absent from the draft that determine whether this delivers liveable density or just more buildings on a strained network.</p>
        <div className="space-y-6">
          {MISSING.map((item) => (
            <Card key={item.title}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                <Tag className={item.tagColor}>{item.tag}</Tag>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.problem}</p>

              <div className="space-y-3 mb-4">
                {item.solutions.map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="font-semibold text-slate-800 text-sm mb-1">{s.label}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                  </div>
                ))}
              </div>

              <div className="border-l-4 border-mosman-pink pl-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Proposed principle</p>
                <p className="text-sm text-slate-700 italic leading-relaxed">{item.principle}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Other gaps */}
      <Card>
        <h3 className="font-bold text-slate-800 mb-4">Other gaps in the draft principles</h3>
        <div className="space-y-4">
          {OTHER_GAPS.map((g) => (
            <div key={g.title} className="flex gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{g.title}</p>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{g.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Option 2 */}
      <div>
        <h3 className="font-bold text-slate-800 mb-1 text-lg">Option 2 — preferred, with conditions</h3>
        <p className="text-sm text-slate-500 mb-4">High and Narrow: 3–28 storeys, 9% of LGA, focused on the Military–Spit corridor.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {OPTION2.map((section) => (
            <Card key={section.title}>
              <h4 className="font-bold text-slate-800 text-sm mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mosman-teal flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      {/* Tax reform */}
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3 mb-3">
          <div className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5">URGENT</div>
          <h3 className="font-bold text-slate-800 text-base">{TAX.title}</h3>
        </div>
        <ul className="space-y-2">
          {TAX.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      {/* Summary */}
      <Card className="border-slate-300 bg-slate-50">
        <h3 className="font-bold text-slate-800 mb-3">Summary</h3>
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          Option 2 is the right framework. Its success depends on two missing principles being binding, not aspirational:
        </p>
        <ol className="space-y-2 list-decimal list-inside">
          <li className="text-sm text-slate-800 font-semibold leading-relaxed">
            Transport infrastructure must keep pace with development — with formal Council advocacy for bypass infrastructure to address Northern Beaches through-traffic growth.
          </li>
          <li className="text-sm text-slate-800 font-semibold leading-relaxed">
            Utility infrastructure capacity must be confirmed and upgraded before density approvals are granted.
          </li>
        </ol>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          Both are currently treated as implementation details. Both determine whether this masterplan delivers liveable density or just more buildings on an already-strained network.
        </p>
      </Card>
    </div>
  )
}
