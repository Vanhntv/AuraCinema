import { useState } from 'react';
import { aboutContent } from '../../data/aboutContent';

function TabButton({ tab, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[140px] rounded-full px-5 py-3 text-sm font-extrabold transition-all duration-200 sm:min-w-[160px] ${
        active
          ? 'bg-gradient-to-r from-[#ff5364] via-[#ff6b4a] to-[#b86a2f] text-white shadow-[0_16px_40px_rgba(255,83,100,0.3)]'
          : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#ff6070]/40 hover:text-white'
      }`}
    >
      {tab.label}
    </button>
  );
}

function SectionShell({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[#111823] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-8">
      <div className="max-w-4xl">
        <span className="block text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
          {eyebrow}
        </span>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function MetricCard({ metric }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        {metric.label}
      </div>
      <div className="mt-3 text-4xl font-black text-white">{metric.value}</div>
      <div className="mt-2 text-sm text-slate-400">{metric.note}</div>
    </article>
  );
}

function ImageGrid({ images, columnsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={`grid gap-4 ${columnsClass}`}>
      {images.map((image) => (
        <figure
          key={image.src}
          className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0f141c]"
        >
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </figure>
      ))}
    </div>
  );
}

function OrgNode({ node, depth = 0 }) {
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-[22px] border px-5 py-4 text-center shadow-[0_14px_30px_rgba(0,0,0,0.18)] ${
          depth === 0
            ? 'border-[#ff6070]/30 bg-gradient-to-r from-[#ff5364] via-[#ff6b4a] to-[#b86a2f] text-white'
            : 'border-white/10 bg-white/[0.03] text-white'
        }`}
      >
        <div className="text-sm font-black uppercase tracking-[0.16em]">{node.title}</div>
        <div className={`mt-1 text-sm ${depth === 0 ? 'text-white/80' : 'text-slate-400'}`}>
          {node.subtitle}
        </div>
      </div>

      {hasChildren && (
        <div className="mt-6 flex w-full flex-col items-center">
          <div className="h-8 w-px bg-white/15" />
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:justify-center">
            {node.children.map((child) => (
              <div key={child.title} className="flex flex-col items-center">
                <div className="w-px h-8 bg-white/15" />
                <OrgNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AboutPage() {
  const [activeTab, setActiveTab] = useState('intro');
  const { page, sections, tabs, intro, services, theaters } = aboutContent;

  const contentMap = {
    intro: (
      <div className="grid gap-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">{intro.legal.title}</h2>
            <dl className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#0f141c] p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {intro.legal.foundedLabel}
                </dt>
                <dd className="mt-2 text-lg font-extrabold text-white">
                  {intro.legal.foundedValue}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0f141c] p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {intro.legal.headquartersLabel}
                </dt>
                <dd className="mt-2 text-lg font-extrabold text-white">
                  {intro.legal.headquartersValue}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0f141c] p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {intro.legal.contactLabel}
                </dt>
                <dd className="mt-2 text-lg font-extrabold text-white">
                  {intro.legal.contactValue}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">{sections.introOverview}</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">{intro.summary}</p>
            <div className="mt-6 rounded-[24px] border border-[#ff6070]/20 bg-[#ff6070]/10 p-4 text-sm leading-7 text-[#ffd2d6]">
              {intro.chartNote}
            </div>
          </article>
        </div>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-black uppercase text-white">{sections.orgChart}</h2>
          <div className="mt-8 overflow-x-auto pb-3">
            <div className="min-w-[720px]">
              <OrgNode node={intro.organizationChart[0]} />
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-black uppercase text-white">{sections.introImages}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">{sections.serviceImagesHint}</p>
          <div className="mt-5">
            <ImageGrid images={intro.imageGrid} />
          </div>
        </article>
      </div>
    ),
    services: (
      <div className="grid gap-6">
        {services.groups.map((group) => (
          <article
            key={group.title}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <h2 className="text-2xl font-black uppercase text-white">{group.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-300">{group.description}</p>
              </div>
              <ImageGrid images={group.images} columnsClass="grid-cols-1 sm:grid-cols-2" />
            </div>
          </article>
        ))}
      </div>
    ),
    theaters: (
      <div className="grid gap-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {theaters.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">{theaters.building.title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {theaters.building.description}
            </p>
            <div className="mt-6 rounded-[24px] border border-white/10 bg-[#0f141c] p-5">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff6070]">
                {theaters.building.starHall.title}
              </div>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-300">
                <div>
                  <span className="font-bold text-white">Nâng cấp:</span>{' '}
                  {theaters.building.starHall.upgradeDate}
                </div>
                <div>
                  <span className="font-bold text-white">Sức chứa:</span>{' '}
                  {theaters.building.starHall.capacity}
                </div>
                <div>{theaters.building.starHall.note}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black uppercase text-white">{sections.theaterSpace}</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">{theaters.spaceNote}</p>
            <div className="mt-5">
              <ImageGrid images={theaters.imageGrid} columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
            </div>
          </article>
        </section>
      </div>
    ),
  };

  return (
    <main className="bg-[#0f141c] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <SectionShell
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
        >
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="mt-8">{contentMap[activeTab]}</div>
        </SectionShell>
      </div>
    </main>
  );
}

export default AboutPage;
