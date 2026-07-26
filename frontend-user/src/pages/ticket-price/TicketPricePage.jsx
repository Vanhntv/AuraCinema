import ticketPriceData from '../../data/ticketPriceData.json';

function InfoPill({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition duration-200 hover:border-white/15 hover:bg-white/[0.045]">
      <div className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 text-base font-extrabold leading-6 text-white">{value}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <span className="block text-xs font-bold tracking-[0.16em] text-[#ff6070]">
        {eyebrow}
      </span>
      <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-slate-300">{description}</p>
    </div>
  );
}

function PriceTable({ table }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111823] shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
      <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="mb-0 text-xl font-extrabold text-white">{table.name}</h2>
          <span className="rounded-full border border-[#ff6070]/20 bg-[#ff6070]/[0.07] px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#ffb4bb]">
            {table.subtitle}
          </span>
        </div>
      </div>

      <div className="hidden border-b border-white/[0.08] bg-white/[0.015] px-6 py-3 text-[11px] font-bold tracking-[0.14em] text-slate-400 md:grid md:grid-cols-[1.35fr_1fr_1fr_1fr] md:gap-4">
        {table.columns.map((column, index) => (
          <div key={column} className={index === 0 ? '' : 'text-right'}>
            {column}
          </div>
        ))}
      </div>

      <div className="divide-y divide-white/[0.07]">
        {table.rows.map((row) => (
          <div
            key={`${table.name}-${row.label}`}
            className="grid gap-3 px-5 py-4 transition duration-200 hover:bg-white/[0.025] sm:px-6 md:grid-cols-[1.35fr_1fr_1fr_1fr] md:items-center md:gap-4"
          >
            <div>
              <div className="text-[15px] font-extrabold text-white">{row.label}</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-300 md:hidden">
                <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-2">
                  <span className="text-slate-400">{table.columns[1]}</span>
                  <strong className="text-white">{row.weekday}{table.currency}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">{table.columns[2]}</span>
                  <strong className="text-white">{row.weekend}{table.currency}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">{table.columns[3]}</span>
                  <strong className="text-white">{row.holiday}{table.currency}</strong>
                </div>
              </div>
            </div>

            <div className="hidden text-right text-base font-extrabold text-white md:block">
              {row.weekday}
              <span className="ml-1 text-xs font-semibold text-slate-400">{table.currency}</span>
            </div>

            <div className="hidden text-right text-base font-extrabold text-white md:block">
              {row.weekend}
              <span className="ml-1 text-xs font-semibold text-slate-400">{table.currency}</span>
            </div>

            <div className="hidden text-right text-base font-extrabold text-white md:block">
              {row.holiday}
              <span className="ml-1 text-xs font-semibold text-slate-400">{table.currency}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalloutList({ title, items, tone = 'neutral' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-[#ff6070]/20 bg-[#ff6070]/[0.06] text-[#ffd2d6]'
      : 'border-white/[0.08] bg-white/[0.025] text-slate-300';

  return (
    <section className={`rounded-[22px] border p-5 ${toneClass}`}>
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <ul className="mt-4 grid gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6070]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardGrid({ title, items }) {
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#111823] p-5">
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.title} className="flex gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ff6070]" />
            <div>
              <h3 className="text-[15px] font-extrabold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PaymentPanel({ title, warnings, terms }) {
  const termDescriptions = new Set(terms.map((term) => term.description));
  const visibleWarnings = warnings.filter((warning) => !termDescriptions.has(warning));

  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#111823] p-5">
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <div className="mt-4 rounded-[18px] border border-[#ff6070]/20 bg-[#ff6070]/[0.06] p-4">
        <ul className="grid gap-2.5">
          {visibleWarnings.map((warning) => (
            <li key={warning} className="flex gap-3 text-sm leading-6 text-[#ffd2d6]">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6070]" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3">
        {terms.map((term) => (
          <article key={term.title} className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3.5">
            <h3 className="text-[15px] font-extrabold text-white">{term.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-300">{term.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TicketPricePage() {
  const {
    page,
    sections,
    highlights,
    pricingTables,
    surcharges,
    offers,
    rules,
    paymentWarnings,
    terms,
  } = ticketPriceData;

  return (
    <main className="bg-[#0f141c] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(255,96,112,0.1),transparent_26%),linear-gradient(180deg,rgba(17,24,35,0.98),rgba(13,18,27,0.98))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:p-6 lg:p-7">
          <SectionHeading
            eyebrow={page.eyebrow}
            title={page.title}
            description={page.description}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <InfoPill key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          {pricingTables.map((table) => (
            <PriceTable key={table.name} table={table} />
          ))}
        </div>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
          <CardGrid title={sections.surcharges} items={surcharges} />
          <CardGrid title={sections.offers} items={offers} />
        </div>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <CalloutList title={sections.ageRules} items={[rules.ageNotice, ...rules.items]} />
          <PaymentPanel title={sections.paymentWarnings} warnings={paymentWarnings} terms={terms} />
        </div>
      </div>
    </main>
  );
}

export default TicketPricePage;
