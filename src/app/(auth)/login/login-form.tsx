"use client";

import { useState } from "react";
import { AuthForm } from "../auth-form";
import DevAccessPanel from "@/components/auth/DevAccessPanel";
import type { DevLoginPanel } from "@/lib/dev-access";

export default function LoginForm({ panel }: { panel: DevLoginPanel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <AuthForm
        mode="login"
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
      />
      <DevAccessPanel
        panel={panel}
        onPick={(e, p) => {
          setEmail(e);
          setPassword(p);
        }}
      />
    </>
  );
}
