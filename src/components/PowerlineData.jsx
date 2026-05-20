import { AlertTriangle, ExternalLink, Ruler, ShieldAlert, Zap } from 'lucide-react'
import {
  MOSMAN_POWERLINE_SUMMARY,
  POWERLINE_PULL,
  POWERLINE_SOURCES,
  SERVICE_SIZING,
  TRANSMISSION_ASSETS,
  VOLTAGE_LIMITS,
} from '../data/powerlines'

const totalLv = MOSMAN_POWERLINE_SUMMARY
  .filter(item => ['lv-overhead', 'service-overhead', 'streetlight-overhead'].includes(item.id))
  .reduce((sum, item) => sum + item.value, 0)

export default function PowerlineData() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Powerline Data And Engineering Basis</h2>
          <p className="text-slate-500 text-sm">
            {POWERLINE_PULL.area} · extracted {formatDate(POWERLINE_PULL.extractedAt)} · {POWERLINE_PULL.networkProvider}
          </p>
        </div>
        <a
          href="https://lookupandlive.com.au/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-mosman-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <ExternalLink size={14} />
          Open Live Map
        </a>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <p>
            {POWERLINE_PULL.sourceNote} Treat these counts as a public asset audit, not a confirmed load-flow
            or spare-capacity assessment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric icon={Zap} label="HV overhead spans" value="36" sub="published public-layer spans inside Mosman LGA" color="text-blue-600" />
        <Metric icon={Zap} label="LV, services, streetlights" value={totalLv.toLocaleString()} sub="published overhead LV/service/streetlight spans" color="text-mosman-pink" />
        <Metric icon={ShieldAlert} label="Poles" value="3,367" sub="Ausgrid pole assets in public layer" color="text-mosman-teal" />
      </div>

      <Section title="Current Public Network Pull" icon={Zap}>
        <DataTable
          columns={['Layer', 'Count', 'Voltage / Category', 'Refresh']}
          rows={MOSMAN_POWERLINE_SUMMARY.map(item => [
            item.label,
            `${item.value.toLocaleString()} ${item.unit}`,
            item.voltage,
            formatDate(item.refreshed),
          ])}
        />
      </Section>

      <Section title="Voltage Allowances" icon={ShieldAlert}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Voltage ranges explain what a compliant supply should stay within. They do not prove a street has
          spare capacity for EV charging, solar export, V2G, or new apartments.
        </p>
        <DataTable
          columns={['Band', 'Nominal', 'Allowed / Operating Range', 'Source']}
          rows={VOLTAGE_LIMITS.map(item => [item.band, item.nominal, item.allowed, item.source])}
        />
      </Section>

      <Section title="Service And Line Sizing" icon={Ruler}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Service ratings are rulebook sizing references. Final line upgrades still depend on route length,
          voltage drop, fault level, transformer loading, thermal rating, earthing, and Ausgrid approval.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SizingTable title="Underground Service Cables" rows={SERVICE_SIZING.underground} />
          <SizingTable title="Overhead Service Cables" rows={SERVICE_SIZING.overhead} />
        </div>
        <div className="mt-4 rounded-lg border border-mosman-line bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Overhead Service Span Notes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICE_SIZING.serviceSpanNotes.map(item => (
              <span key={item} className="rounded border border-mosman-line bg-slate-50 px-2 py-1 text-xs text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-mosman-line bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Ausgrid LV Overhead Mains Conductors</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICE_SIZING.lvOverheadMains.map(item => (
              <span key={item} className="rounded border border-mosman-line bg-white px-2 py-1 text-xs text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Transmission Reference" icon={Zap}>
        <DataTable
          columns={['Asset', 'Name', 'Construction', 'Voltage', 'Status']}
          rows={TRANSMISSION_ASSETS.map(item => [item.type, item.name, item.construction, item.voltage, item.status])}
        />
        <p className="mt-3 text-xs text-slate-500">
          Transmission assets are from Geoscience Australia and are separate from Ausgrid street-level distribution data.
        </p>
      </Section>

      <Section title="Sources" icon={ExternalLink}>
        <div className="divide-y divide-mosman-line">
          {POWERLINE_SOURCES.map(source => (
            <a
              key={`${source.label}-${source.url}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 py-3 hover:bg-slate-50"
            >
              <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-mosman-teal" />
              <span>
                <span className="block text-sm font-medium text-slate-800">{source.label}</span>
                <span className="block text-xs text-slate-500">{source.note}</span>
              </span>
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-lg border border-mosman-line bg-white p-4 shadow-sm">
      <Icon size={18} className={`${color} mb-2`} />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-mosman-line bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-mosman-line bg-slate-50 px-4 py-3">
        <Icon size={16} className="text-mosman-teal" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-mosman-line text-xs uppercase text-slate-500">
            {columns.map(column => (
              <th key={column} className="px-3 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-mosman-border">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SizingTable({ title, rows }) {
  return (
    <div className="rounded-lg border border-mosman-line">
      <p className="border-b border-mosman-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">{title}</p>
      <DataTable
        columns={['Cable', 'Cores', 'Rating']}
        rows={rows.map(row => [row.cable, row.cores, row.rating])}
      />
    </div>
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}
