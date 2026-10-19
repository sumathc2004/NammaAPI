"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { Notice } from "@/components/auth/AuthCard";
import { createApiKey, revokeApiKey, type CreateKeyState } from "@/app/actions/keys";
import type { ApiKey } from "@/lib/auth/apiKeys";

const MAX_KEYS = 5;

export function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
  const [state, formAction, pending] = useActionState(createApiKey, {} as CreateKeyState);
  const [copied, setCopied] = useState(false);
  const [revokeError, setRevokeError] = useState<string>();
  const [revokingId, setRevokingId] = useState<string>();
  const [, startTransition] = useTransition();

  function revoke(key: ApiKey) {
    if (!confirm(`Revoke "${key.name}"? Any integration using this key will stop working immediately.`)) return;
    setRevokingId(key.id);
    setRevokeError(undefined);
    startTransition(async () => {
      const result = await revokeApiKey(key.id);
      if (result.error) setRevokeError(result.error);
      setRevokingId(undefined);
    });
  }

  async function copy(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      {state.created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            &ldquo;{state.created.name}&rdquo; created — copy it now, you won&apos;t be able to see it again.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-text-primary">
              {state.created.secret}
            </code>
            <Button type="button" size="sm" variant="secondary" onClick={() => copy(state.created!.secret)}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {revokeError && <Notice tone="error">{revokeError}</Notice>}

      {keys.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-border px-4 py-6 text-center text-sm text-text-secondary">
          No API keys yet. Create one below to start making sandbox requests.
        </p>
      ) : (
        <ul className="divide-y divide-brand-border rounded-xl border border-brand-border">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{key.name}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  <code className="font-mono">{key.prefix}…</code> · created{" "}
                  {new Date(key.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-start text-red-600 hover:bg-red-50 sm:self-auto"
                disabled={revokingId === key.id}
                onClick={() => revoke(key)}
              >
                {revokingId === key.id ? "Revoking…" : "Revoke"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {keys.length < MAX_KEYS ? (
        <form key={state.created?.secret} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <FormInput label="New key name" name="name" maxLength={60} placeholder="e.g. Production server" error={state.error} />
          </div>
          <Button type="submit" className="sm:mt-[26px]" disabled={pending}>
            {pending ? "Creating…" : "Create key"}
          </Button>
        </form>
      ) : (
        <Notice tone="info">You&apos;ve reached the limit of {MAX_KEYS} active keys. Revoke one to create another.</Notice>
      )}
    </div>
  );
}
