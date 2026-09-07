"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/chat");
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    if (!trimmedPhone || !trimmedName) {
      setError("Please enter both your phone number and name.");
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedPhone, trimmedName);
      router.replace("/chat");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.details?.[0]?.message ?? err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-linear-to-br from-neutral-50 to-neutral-100">
      <header className="px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 transition hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
          Pingback
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">
              Welcome to Pingback
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Enter your phone number and name to continue. New here?
              You&apos;ll be signed up automatically.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting && <Spinner className="h-4 w-4 border-white/30 border-t-white" />}
              Continue
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400">
            <Link href="/" className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-600">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
