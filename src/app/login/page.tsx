"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: "Login gagal." }));
      setError(body.message ?? "Login gagal.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Qasir Modern</p>
          <h1>Masuk ke kasir</h1>
          <p className="muted">Session aman memakai cookie httpOnly, password tersimpan sebagai hash bcrypt.</p>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="primary full" type="submit" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
          <p className="hint">Demo: owner/admin/kasir/gudang dengan password 123456 setelah seed database.</p>
        </form>
      </section>
    </main>
  );
}
