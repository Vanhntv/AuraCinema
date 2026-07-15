import ticketPriceData from '../../data/ticketPriceData.json';

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <span className="block text-sm font-bold uppercase tracking-[0.22em] text-[#ff6070]">
        {eyebrow}
      </span>
      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white max-sm:text-2xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
    </div>
  );
}

function PriceTable({ table }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111823] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mb-0 text-2xl font-black uppercase text-white">{table.name}</h2>
          <span className="rounded-full border border-[#ff6070]/30 bg-[#ff6070]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ff9aa3]">
            {table.subtitle}
          </span>
        </div>
      </div>

      <div className="hidden border-b border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 md:grid md:grid-cols-[1.4fr_1fr_1fr_0.9fr] md:gap-4">
        {table.columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>

      <div className="grid gap-3 p-4 sm:p-6">
        {table.rows.map((row) => (
          <div
            key={`${table.name}-${row.label}`}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1.4fr_1fr_1fr_0.9fr] md:items-center md:gap-4"
          >
            <div>
              <div className="text-base font-extrabold text-white">{row.label}</div>
              <div className="mt-1 text-sm text-slate-400 md:hidden">
                {table.columns[1]}: {row.weekday}
                {table.currency} · {table.columns[2]}: {row.weekend}
                {table.currency}
              </div>
            </div>

            <div className="hidden text-lg font-black text-white md:block">
              {row.weekday}
              <span className="ml-1 text-sm font-semibold text-slate-400">{table.currency}</span>
            </div>

            <div className="hidden text-lg font-black text-white md:block">
              {row.weekend}
              <span className="ml-1 text-sm font-semibold text-slate-400">{table.currency}</span>
            </div>

            <div className="justify-self-start rounded-full border border-white/10 bg-[#0f141c] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffb4bb]">
              {row.badge}
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
      ? 'border-[#ff6070]/30 bg-[#ff6070]/10 text-[#ffd2d6]'
      : 'border-white/10 bg-white/[0.03] text-slate-300';

  return (
    <section className={`rounded-[28px] border p-6 ${toneClass}`}>
      <h2 className="text-2xl font-black uppercase text-white">{title}</h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ff6070]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardGrid({ title, items }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#111823] p-6">
      <h2 className="text-2xl font-black uppercase text-white">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
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
  } =
    ticketPriceData;

  return (
    <main className="bg-[#0f141c] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,96,112,0.18),transparent_30%),linear-gradient(180deg,rgba(17,24,35,0.98),rgba(13,18,27,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
          <SectionHeading
            eyebrow={page.eyebrow}
            title={page.title}
            description={page.description}
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <InfoPill key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8">
          {pricingTables.map((table) => (
            <PriceTable key={table.name} table={table} />
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <CardGrid title={sections.surcharges} items={surcharges} />
          <CardGrid title={sections.offers} items={offers} />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <CalloutList title={sections.ageRules} items={[rules.ageNotice, ...rules.items]} />
          <section className="rounded-[28px] border border-white/10 bg-[#111823] p-6">
            <h2 className="text-2xl font-black uppercase text-white">{sections.paymentWarnings}</h2>
            <div className="mt-5 grid gap-4">
              {paymentWarnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-2xl border border-[#ff6070]/25 bg-[#ff6070]/10 p-4 text-sm leading-6 text-[#ffd2d6]"
                >
                  {warning}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4">
              {terms.map((term) => (
                <article key={term.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-base font-extrabold text-white">{term.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{term.description}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[#ff6070]/25 bg-[#ff6070]/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[#ffd2d6]">
              {sections.terms}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default TicketPricePage;
