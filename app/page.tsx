import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { LandingNavbar } from "@/components/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNavbar />

      {/* ============== HERO ============== */}
      <section className="relative px-6 md:px-12 pt-24 pb-32 max-w-6xl mx-auto">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-acid/10 blur-[120px] -z-10 pointer-events-none" />

        <div className="inline-flex items-center gap-2.5 mb-8 font-mono text-[11px] uppercase tracking-eyebrow text-ink-dim">
          <span className="w-2 h-2 rounded-full bg-acid animate-pulse" />
          New from Haterz.ai
        </div>

        <h1 className="font-display font-bold text-[64px] md:text-[88px] leading-[0.95] tracking-tightest max-w-4xl">
          Stop searching.<br />
          Start knowing<span className="text-acid">.</span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-ink-dim max-w-2xl leading-relaxed">
          Paste your SOPs, policies, and docs. Ask anything. Get answers from your
          actual documents — not from thin air.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn btn-primary">
            Start free trial →
          </Link>
          <a href="#how" className="btn btn-ghost">
            See how it works
          </a>
        </div>

        <p className="mt-6 font-mono text-xs text-ink-mute tracking-wider">
          NO CREDIT CARD REQUIRED · CANCEL ANYTIME
        </p>
      </section>

      {/* ============== WHAT WE HATE ============== */}
      <section className="px-6 md:px-12 py-24 border-t border-line">
        <div className="max-w-6xl mx-auto">
          <div className="eyebrow mb-6">
            <span className="eyebrow-num">02</span>
            <span>/ WHAT WE HATE</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tighter max-w-3xl mb-16">
            We hate the way teams find information.
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Slack archaeology",
                body: "Scrolling through 3 months of messages to find one answer.",
              },
              {
                title: "The wrong version",
                body: "Someone answering from a policy doc that was updated six months ago.",
              },
              {
                title: "Ask Karen",
                body: "Karen is on leave. Nobody else knows where the SOP lives.",
              },
            ].map((card, i) => (
              <div
                key={card.title}
                className="relative group bg-bg-2 border border-line-2 rounded-[2px] p-7
                           transition-all duration-200 hover:-translate-y-1 hover:border-line"
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-acid origin-top
                             scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
                />
                <div className="font-mono text-[11px] tracking-section text-acid mb-5">
                  0{i + 1}
                </div>
                <h3 className="font-display font-semibold text-2xl tracking-tight mb-3">
                  {card.title}
                </h3>
                <p className="text-ink-dim text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how" className="px-6 md:px-12 py-24 border-t border-line">
        <div className="max-w-6xl mx-auto">
          <div className="eyebrow mb-6">
            <span className="eyebrow-num">03</span>
            <span>/ HOW IT WORKS</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tighter max-w-3xl mb-16">
            Three steps. No setup theatre.
          </h2>

          <div className="grid md:grid-cols-3 gap-12 md:gap-6">
            {[
              {
                step: "01",
                title: "Paste your documents",
                body: "SOPs, policies, FAQs, handbooks — anything. Drop it in the document panel. Save is automatic.",
              },
              {
                step: "02",
                title: "Ask a question",
                body: "In plain English. Like you're asking a colleague who already read everything.",
              },
              {
                step: "03",
                title: "Get an answer",
                body: "From your documents. Cited. Honest. Instant. If it's not in there, we say so — instead of making it up.",
              },
            ].map((s) => (
              <div key={s.step} className="border-l-2 border-acid pl-6">
                <div className="font-mono text-acid text-sm tracking-section mb-4">
                  STEP {s.step}
                </div>
                <h3 className="font-display font-semibold text-2xl tracking-tight mb-3">
                  {s.title}
                </h3>
                <p className="text-ink-dim text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PRICING ============== */}
      <section id="pricing" className="px-6 md:px-12 py-24 border-t border-line">
        <div className="max-w-5xl mx-auto">
          <div className="eyebrow mb-6">
            <span className="eyebrow-num">04</span>
            <span>/ PRICING</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tighter mb-4">
            One price<span className="text-acid">.</span> No bullshit.
          </h2>
          <p className="text-ink-dim mb-14 max-w-xl">
            Pay monthly. Cancel anytime. Your documents stay in our database — never sold,
            never shared, never used to train AI models.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {[PLANS.starter, PLANS.pro].map((plan, i) => (
              <div
                key={plan.id}
                className={`relative bg-bg-2 border rounded-[2px] p-8 transition-all
                            ${i === 1 ? "border-acid shadow-acid-glow" : "border-line-2"}`}
              >
                {i === 1 && (
                  <div className="absolute -top-3 left-8 bg-acid text-black font-mono text-[10px] tracking-section px-2 py-1 rounded-[2px]">
                    POPULAR
                  </div>
                )}
                <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mb-3">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-display font-bold text-5xl tracking-tightest">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-ink-mute font-mono text-sm">/ month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm text-ink"
                    >
                      <span className="text-acid mt-0.5">→</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`btn w-full ${i === 1 ? "btn-primary" : "btn-ghost"}`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-ink-dim max-w-2xl leading-relaxed">
            Your documents stay in our database — never sold, never shared, never used
            to train AI models. Your API calls go through our Anthropic key. You pay us. Simple.
          </p>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="px-6 md:px-12 py-12 border-t border-line">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="font-display font-bold text-lg tracking-tighter">
              HATE Intelligence
            </div>
            <div className="font-mono text-[11px] tracking-eyebrow uppercase text-ink-dim mt-1">
              A Haterz<span className="text-acid">.</span>ai product —
              Fuck the Hype. Fix the Work.
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-ink-dim">
            <Link href="/login" className="hover:text-acid transition-colors">
              Login
            </Link>
            <a href="#pricing" className="hover:text-acid transition-colors">
              Pricing
            </a>
            <a
              href="mailto:wtf@haterz.ai"
              className="hover:text-acid transition-colors"
            >
              wtf@haterz.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
