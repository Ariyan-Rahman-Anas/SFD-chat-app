import Link from "next/link";
import {
  ArrowRight,
  CodeXml,
  Users,
  Zap,
  MousePointerClick,
  ShieldCheck,
  MessageCircle,
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
            href="https://github.com/Ariyan-Rahman-Anas/chat-app-frontend-task"
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
              href="https://github.com/Ariyan-Rahman-Anas/chat-app-frontend-task"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300"
            >
              <CodeXml className="h-4 w-4" />
              View the code
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LiveDemoPreview />
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

      <footer className="border-t border-neutral-100 px-6 py-8 text-center text-xs text-neutral-400">
        Built with Next.js, TypeScript, Tailwind CSS &amp; Socket.io — a
        frontend take-home submission.
      </footer>
    </div>
  );
}
