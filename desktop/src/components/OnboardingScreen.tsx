import { useState } from "react";

export function OnboardingScreen({
  onSubmit
}: {
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSubmit(username, password);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not store the desktop credentials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-shell">
      <div className="hero-panel">
        <p className="eyebrow">Desktop onboarding</p>
        <h1>TUE Study Hub for desktop</h1>
        <p className="lead">
          Store your university credentials locally with operating-system backed encryption, then run the
          existing Python API as a managed local sidecar.
        </p>
        <div className="bullet-grid">
          <div>
            <strong>Local only</strong>
            <span>The desktop app talks to a local backend on `127.0.0.1`.</span>
          </div>
          <div>
            <strong>Encrypted storage</strong>
            <span>Credentials are encrypted before they are written into the app data directory.</span>
          </div>
          <div>
            <strong>No mock mode</strong>
            <span>The dashboard only shows live Alma, ILIAS, Moodle, and mail data.</span>
          </div>
        </div>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Credentials</p>
          <h2>Connect your uni account</h2>
          <p className="muted">
            Use the same `UNI_USERNAME` and `UNI_PASSWORD` pair that the Python backend already expects.
          </p>
        </div>

        <label className="field">
          <span>Username</span>
          <input
            autoComplete="username"
            placeholder="ZDV ID or UNI username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="inline-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving credentials..." : "Save and start backend"}
        </button>
      </form>
    </div>
  );
}
