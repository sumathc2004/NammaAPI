import { Button } from "@/components/ui/Button";
import { ApiFlowIllustration } from "@/components/illustrations/ApiFlowIllustration";
import { IndustryMarquee } from "@/components/sections/IndustryMarquee";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient-radial">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid-light" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-primary/30 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[80vh] w-full flex-col justify-center py-12">
        <IndustryMarquee dark bare />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 pb-20 pt-4 sm:px-6 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            Payment Infrastructure for Modern Businesses
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Power Your Business Payments With Secure APIs
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/75">
            Automate payouts, payment collection, salary processing and financial workflows with
            modern APIs built for businesses.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button href="/signup" size="lg">
              Get Started
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Talk to Sales
            </Button>
            <Button href="/developers" variant="outline" size="lg">
              View API Docs
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/15 bg-white p-6 shadow-2xl shadow-brand-navy/40 sm:p-10">
          <ApiFlowIllustration />
          <p className="mt-4 text-center text-xs text-text-secondary">
            Conceptual payment flow. Not a real-time transaction feed.
          </p>
        </div>
      </div>
    </section>
  );
}
