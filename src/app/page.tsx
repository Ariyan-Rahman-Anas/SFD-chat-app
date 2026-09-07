import Link from "next/link";
import {
  ArrowRight,
  CodeXml,
  Users,
  Zap,
  MousePointerClick,
  ShieldCheck,
  MessageCircle,
  Phone,
  Search,
  Layers,
  RadioTower,
  ListTree,
  Fingerprint,
} from "lucide-react";
import { LiveDemoPreview } from "@/components/landing/LiveDemoPreview";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time, always",
    description:
      "Messages land the instant they're sent over a live socket connection — no polling, no refresh button.",
  },
  {
    icon: Users,
    title: "Direct & group chats",
    description:
      "Start a one-to-one conversation or spin up a group with admins, in a couple of taps.",
  },
  {
    icon: MousePointerClick,
    title: "Scroll that respects you",
    description:
      "Auto-scrolls to new messages by default, but never yanks you down while you're reading history.",
  },
  {
    icon: ShieldCheck,
    title: "Built for the edge cases",
    description:
      "Loading, empty, and error states are handled everywhere — not just the happy path.",
  },
];

const STEPS = [
  {
    icon: Phone,
    title: "Sign in with a phone number",
    description:
      "No password, no separate sign-up screen. A new number is registered on the spot; an existing one logs straight in.",
  },
  {
    icon: Search,
    title: "Find someone, or start a group",
    description:
      "Search by name or number to open a direct conversation, or add a few people at once to spin up a group.",
  },
  {
    icon: MessageCircle,
    title: "Chat, live",
    description:
      "Every message you send — and every one you receive — shows up instantly, in every open tab, without a refresh.",
  },
];

const ENGINEERING_HIGHLIGHTS = [
  {
    icon: RadioTower,
    label: "Socket.io-driven delivery",
    detail: "with REST as the source of truth for history",
  },
  {
    icon: ListTree,
    label: "Cursor-paginated history",
    detail: "loads older messages without losing scroll position",
  },
  {
    icon: Layers,
    label: "Deduplicated message stream",
    detail: "REST responses and socket echoes never double up",
  },
  {
    icon: Fingerprint,
    label: "Typed end-to-end",
    detail: "one Message shape, normalized at the socket boundary",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1 bg-white text-neutral-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">Pingback</span>
        </div>
        <nav className="flex items-center gap-3">
          <a
            href="https://github.com/Ariyan-Rahman-Anas/SFD-chat-app"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:flex"
          >
            <CodeXml className="h-4 w-4" />
            Source
          </a>
          <Link
            href="/login"
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Try the demo
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 sm:py-20 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live &amp; connected
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Conversations that keep up with you.
          </h1>
          <p className="mt-5 max-w-md text-base text-neutral-500 sm:text-lg">
            Direct messages and groups, delivered the instant they&apos;re sent.
            No refresh, no waiting, no lost place in the conversation.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Start chatting
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Ariyan-Rahman-Anas/SFD-chat-app"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300"
            >
              <CodeXml className="h-4 w-4" />
              View the code
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-neutral-100 pt-6">
            <div>
              <dt className="text-xl font-semibold text-neutral-900">2</dt>
              <dd className="text-xs text-neutral-500">chat modes — direct &amp; group</dd>
            </div>
            <div>
              <dt className="text-xl font-semibold text-neutral-900">0</dt>
              <dd className="text-xs text-neutral-500">refreshes needed to see a reply</dd>
            </div>
            <div>
              <dt className="text-xl font-semibold text-neutral-900">100%</dt>
              <dd className="text-xs text-neutral-500">TypeScript, end to end</dd>
            </div>
          </dl>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LiveDemoPreview />
        </div>
      </section>

      <section className="border-t border-neutral-100 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold text-neutral-900">
            From a phone number to a live conversation in three steps
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="relative pl-12">
                <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <Icon className="mb-2 h-5 w-5 text-neutral-400" />
                <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
                <p className="mt-1.5 text-sm text-neutral-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-100 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Everything a chat screen needs — nothing it doesn&apos;t
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-neutral-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-100 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">
                Under the hood
              </h2>
              <p className="mt-2 max-w-lg text-sm text-neutral-500">
                A few of the decisions that made the real-time behavior
                reliable rather than just demo-able.
              </p>
            </div>
            <a
              href="https://github.com/Ariyan-Rahman-Anas/SFD-chat-app/blob/main/docs/API.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
            >
              Read the API notes
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {ENGINEERING_HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{label}</p>
                  <p className="text-sm text-neutral-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-neutral-900">
          Try it yourself — no account setup needed
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-500">
          Enter any phone number and a name to jump straight in. New numbers
          are registered automatically.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Start chatting
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-neutral-100 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Next.js", "TypeScript", "Tailwind CSS", "Socket.io"].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500"
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            A frontend take-home submission — built end to end, including the
            API investigation behind it.
          </p>
        </div>
      </footer>
    </div>
  );
}
