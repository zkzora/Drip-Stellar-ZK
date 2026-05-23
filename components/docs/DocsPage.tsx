import Link from "next/link";
import { DOCS_NAV, DOCS_PAGES, type DocPage, type DocSection } from "@/lib/docs-content";
import { Icon } from "@/components/ui/Icon";

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070612]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex min-h-10 items-center gap-2 rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612]"
        >
          <img src="/logo.png" width={24} height={24} alt="DRIP" />
          <span className="text-[15px] font-medium tracking-tight">DRIP</span>
        </Link>
        <span className="hidden text-white/20 sm:inline">/</span>
        <span className="hidden text-[13px] text-white/60 sm:inline">Documentation</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard"
            className="btn-ghost flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[12.5px] text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612]"
          >
            Dashboard
            <Icon name="arrow-up-right" size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function DocsNav({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="space-y-1" aria-label="Documentation">
      {DOCS_NAV.map((item) => {
        const isActive = item.slug === activeSlug;
        return (
          <Link
            key={item.slug}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612] ${
              isActive
                ? "border-violet-400/25 bg-violet-400/10 text-violet-100"
                : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
            }`}
          >
            <Icon name={item.icon} size={14} className={isActive ? "text-violet-200" : "text-white/40"} />
            <span>{item.navTitle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileDocsNav({ activeTitle, activeSlug }: { activeTitle: string; activeSlug: string }) {
  return (
    <details className="mb-8 rounded-xl border border-white/10 bg-white/[0.025] lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13px] text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Icon name="book-open" size={14} className="text-violet-200" />
          {activeTitle}
        </span>
        <Icon name="chevron-down" size={14} className="text-white/45" />
      </summary>
      <div className="border-t border-white/5 p-2">
        <DocsNav activeSlug={activeSlug} />
      </div>
    </details>
  );
}

function PageHero({ page }: { page: DocPage }) {
  return (
    <div className="mb-10 border-b border-white/5 pb-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.06] px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-violet-100">
        <Icon name={page.icon} size={13} />
        {page.eyebrow}
      </div>
      <h1 className="max-w-[780px] text-[34px] font-medium leading-[1.08] tracking-tight text-iri sm:text-[46px]">
        {page.title}
      </h1>
      <p className="mt-5 max-w-[720px] text-[15px] leading-7 text-white/70 sm:text-[16px]">
        {page.lead}
      </p>
    </div>
  );
}

function TextSection({ section }: { section: Extract<DocSection, { type: "text" }> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      <div className="space-y-4">
        {section.body.map((paragraph) => (
          <p key={paragraph} className="max-w-[720px] text-[14.5px] leading-7 text-white/65">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function ListSection({ section }: { section: Extract<DocSection, { type: "list" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      {section.intro && (
        <p className="mt-3 max-w-[720px] text-[14.5px] leading-7 text-white/65">{section.intro}</p>
      )}
      <ul className="mt-5 space-y-3">
        {section.items.map((item) => (
          <li key={item} className="flex max-w-[760px] gap-3 text-[14px] leading-7 text-white/65">
            <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StepsSection({ section }: { section: Extract<DocSection, { type: "steps" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      <div className="mt-6 space-y-4">
        {section.steps.map((step, index) => (
          <div key={step.title} className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-[64px_1fr]">
            <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-violet-200">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-white">{step.title}</h3>
              <p className="mt-2 max-w-[700px] text-[14px] leading-7 text-white/60">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardsSection({ section }: { section: Extract<DocSection, { type: "cards" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      {section.intro && (
        <p className="mt-3 max-w-[720px] text-[14.5px] leading-7 text-white/65">{section.intro}</p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {section.cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <h3 className="text-[15px] font-medium text-white">{card.title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-white/60">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FaqSection({ section }: { section: Extract<DocSection, { type: "faq" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
        {section.items.map((item) => (
          <details key={item.question} className="group border-b border-white/5 last:border-0">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[14.5px] font-medium text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300 [&::-webkit-details-marker]:hidden">
              {item.question}
              <Icon name="chevron-down" size={15} className="shrink-0 text-white/40 transition group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 text-[14px] leading-7 text-white/60">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function CodeSection({ section }: { section: Extract<DocSection, { type: "code" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      {section.intro && (
        <p className="mt-3 max-w-[720px] text-[14.5px] leading-7 text-white/65">{section.intro}</p>
      )}
      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0c0a18]">
        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-white/5 px-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            {section.filename ?? section.language}
          </span>
          <span className="font-mono text-[11px] text-violet-200/70">{section.language}</span>
        </div>
        <pre className="overflow-x-auto p-4 text-[12.5px] leading-6 text-white/72">
          <code>{section.code}</code>
        </pre>
      </div>
    </section>
  );
}

function ReferenceSection({ section }: { section: Extract<DocSection, { type: "reference" }> }) {
  return (
    <section>
      <h2 className="text-[22px] font-medium tracking-tight text-white">{section.title}</h2>
      {section.intro && (
        <p className="mt-3 max-w-[720px] text-[14.5px] leading-7 text-white/65">{section.intro}</p>
      )}
      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
        {section.items.map((item) => (
          <div key={item.label} className="grid gap-2 border-b border-white/5 px-5 py-4 last:border-0 sm:grid-cols-[minmax(190px,260px)_1fr]">
            <div className="flex min-w-0 items-start gap-2">
              <code className="break-words font-mono text-[12.5px] text-violet-100">{item.label}</code>
              {item.meta && (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/45">
                  {item.meta}
                </span>
              )}
            </div>
            <p className="text-[13.5px] leading-6 text-white/60">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoteSection({ section }: { section: Extract<DocSection, { type: "note" }> }) {
  const warning = section.tone === "warning";
  return (
    <section
      className={`rounded-xl border p-5 ${
        warning
          ? "border-amber-300/25 bg-amber-300/[0.06]"
          : "border-violet-300/25 bg-violet-300/[0.055]"
      }`}
    >
      <div className="flex gap-3">
        <Icon
          name={warning ? "triangle-alert" : "info"}
          size={17}
          className={warning ? "mt-0.5 shrink-0 text-amber-200" : "mt-0.5 shrink-0 text-violet-200"}
        />
        <div>
          <h2 className="text-[15px] font-medium text-white">{section.title}</h2>
          <p className="mt-2 max-w-[760px] text-[14px] leading-7 text-white/65">{section.body}</p>
        </div>
      </div>
    </section>
  );
}

function RenderSection({ section }: { section: DocSection }) {
  if (section.type === "text") return <TextSection section={section} />;
  if (section.type === "list") return <ListSection section={section} />;
  if (section.type === "steps") return <StepsSection section={section} />;
  if (section.type === "cards") return <CardsSection section={section} />;
  if (section.type === "faq") return <FaqSection section={section} />;
  if (section.type === "code") return <CodeSection section={section} />;
  if (section.type === "reference") return <ReferenceSection section={section} />;
  return <NoteSection section={section} />;
}

function NextPrevious({ page }: { page: DocPage }) {
  const index = DOCS_PAGES.findIndex((candidate) => candidate.slug === page.slug);
  const previous = index > 0 ? DOCS_PAGES[index - 1] : undefined;
  const next = index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : undefined;

  return (
    <nav className="mt-14 grid gap-3 border-t border-white/5 pt-6 sm:grid-cols-2" aria-label="Docs pagination">
      {previous ? (
        <Link
          href={previous.href}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-300/30 hover:bg-violet-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612]"
        >
          <div className="flex items-center gap-2 text-[12px] text-white/40">
            <Icon name="chevron-left" size={13} />
            Previous
          </div>
          <div className="mt-1 text-[14px] font-medium text-white">{previous.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-300/30 hover:bg-violet-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612] sm:text-right"
        >
          <div className="flex items-center gap-2 text-[12px] text-white/40 sm:justify-end">
            Next
            <Icon name="chevron-right" size={13} />
          </div>
          <div className="mt-1 text-[14px] font-medium text-white">{next.title}</div>
        </Link>
      )}
    </nav>
  );
}

export default function DocsPage({ page }: { page: DocPage }) {
  return (
    <div className="min-h-screen bg-[#070612]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-48 left-[32%] h-[520px] w-[720px] glow-orb opacity-25" />
      </div>

      <TopBar />

      <div className="mx-auto flex max-w-[1240px]">
        <aside className="sticky top-[69px] hidden h-[calc(100vh-69px)] w-[250px] shrink-0 overflow-y-auto px-4 py-8 lg:block">
          <div className="mb-3 px-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">
            Docs
          </div>
          <DocsNav activeSlug={page.slug} />
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-white">
              <Icon name="lock" size={14} className="text-violet-200" />
              Private alpha
            </div>
            <p className="mt-2 text-[12.5px] leading-5 text-white/55">
              DRIP is preparing for controlled mainnet alpha access with approved wallets.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-9 pb-24 sm:px-8 lg:px-12">
          <MobileDocsNav activeTitle={page.navTitle} activeSlug={page.slug} />
          <PageHero page={page} />
          <div className="space-y-12">
            {page.sections.map((section, index) => (
              <RenderSection key={`${section.type}-${section.title}-${index}`} section={section} />
            ))}
          </div>
          <NextPrevious page={page} />
        </main>
      </div>
    </div>
  );
}
