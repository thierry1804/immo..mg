"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  mode: "login" | "signup";
  email?: string;
  password?: string;
  onEmailChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
};

export function AuthForm({
  mode,
  email: controlledEmail,
  password: controlledPassword,
  onEmailChange,
  onPasswordChange,
}: Props) {
  const router = useRouter();
  const [internalEmail, setInternalEmail] = useState("");
  const [internalPassword, setInternalPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const email = controlledEmail ?? internalEmail;
  const password = controlledPassword ?? internalPassword;
  const setEmail = onEmailChange ?? setInternalEmail;
  const setPassword = onPasswordChange ?? setInternalPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(translateAuthError(data.error, mode));
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-navy">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mt-1.5"
          placeholder="vous@exemple.mg"
        />
      </label>
      <label className="block text-sm font-medium text-navy">
        Mot de passe
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mt-1.5"
          placeholder={mode === "signup" ? "8 caractères minimum" : undefined}
        />
      </label>
      {error ? (
        <p
          className="rounded-xl border border-absent/30 bg-absent-bg px-3 py-2 text-sm text-navy"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="focus-gold w-full rounded-full bg-navy px-4 py-3 text-sm font-semibold text-paper transition hover:bg-navy-800 disabled:opacity-50"
      >
        {pending
          ? "Patientez…"
          : mode === "login"
            ? "Se connecter"
            : "Créer mon compte"}
      </button>
    </form>
  );
}

function translateAuthError(raw: string | undefined, mode: "login" | "signup"): string {
  switch (raw) {
    case "Invalid email or password":
      return "Email ou mot de passe invalide.";
    case "Invalid credentials":
      return "Identifiants incorrects.";
    case "Email already registered":
      return "Cet email est déjà utilisé.";
    default:
      return raw ?? (mode === "login" ? "Connexion impossible." : "Inscription impossible.");
  }
}
