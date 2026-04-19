import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Shield,
  BarChart3,
  Brain,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: TrendingUp,
    title: "Year-by-Year Projections",
    description: "Model your complete financial journey from today to age 100 with detailed net worth tracking.",
  },
  {
    icon: BarChart3,
    title: "Monte Carlo Simulation",
    description: "Run 1,000+ simulations to understand your probability of a successful retirement across market scenarios.",
  },
  {
    icon: Shield,
    title: "Full Tax Modeling",
    description: "Federal and all 50-state tax brackets, FICA, capital gains, RMDs, and Roth conversion optimization.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Get personalized, actionable recommendations to optimize your retirement strategy.",
  },
];

const checklistItems = [
  "401k, Roth IRA, Traditional IRA, HSA, and taxable accounts",
  "Mortgage & real estate with full amortization",
  "Social Security estimation and claiming strategy",
  "Education planning with 529 accounts",
  "Healthcare & Medicare bridge costs",
  "Roth conversion ladder optimizer",
  "Scenario comparison with live sliders",
  "Save and compare multiple retirement scenarios",
];

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">RetireWise</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm">Dashboard</Button>
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </SignInButton>
                <Link href="/sign-up">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center">
          <Badge className="mb-6" variant="secondary">
            Free to use · No credit card required
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Plan your retirement{" "}
            <span className="text-primary">with confidence</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
            The most comprehensive free retirement calculator. Model every aspect of
            your financial life — taxes, mortgage, education, healthcare, and more.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 px-8">
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button size="lg" className="gap-2 px-8">
                  Start planning for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to plan retirement
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-6">
                  <f.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="mb-4 text-3xl font-bold">
                  More complete than any spreadsheet
                </h2>
                <p className="mb-8 text-muted-foreground">
                  RetireWise models your complete financial picture — the kind of
                  analysis that used to require a financial advisor.
                </p>
                <ul className="space-y-3">
                  {checklistItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border bg-card p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Readiness Score</p>
                    <p className="text-5xl font-bold text-primary">87</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-5xl font-bold text-green-500">91%</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Projected retirement assets", value: "$2.4M" },
                    { label: "Can retire at", value: "Age 63" },
                    { label: "Annual retirement income", value: "$96,000" },
                    { label: "Portfolio lasts to", value: "Age 94+" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary py-20 text-primary-foreground">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Start planning your retirement today
            </h2>
            <p className="mb-8 opacity-90">
              Free forever. Your data stays private. No credit card required.
            </p>
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="gap-2 px-8">
                  Go to your dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="gap-2 px-8">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>RetireWise — for informational purposes only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
