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
  const canSubmit = username.trim().length > 0 && password.length > 0 && !saving;

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
      <section className="hero-panel onboarding-copy">
        <p className="eyebrow">Desktop onboarding</p>
        <h1>TUE Study Hub Desktop</h1>
        <p className="lead">
          Connect once to run the local study workspace with live university data and credentials encrypted on
          this device.
        </p>

        <dl className="assurance-list">
          <div>
            <dt>Local runtime</dt>
            <dd>The desktop app talks to the backend running on this machine.</dd>
          </div>
          <div>
            <dt>Credential storage</dt>
            <dd>Credentials are encrypted before they are written into the app data directory.</dd>
          </div>
          <div>
            <dt>Data source</dt>
            <dd>The dashboard loads real Alma, ILIAS, Moodle, talks, and mail data.</dd>
          </div>
        </dl>
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <p className="eyebrow">Credentials</p>
          <h2>University login</h2>
          <p className="muted">
            Use the same university username and password that the local backend expects.
          </p>
        </div>

        <div className="field-stack">
          <label className="field">
            <span>University username</span>
            <input
              autoComplete="username"
              placeholder="ZDV ID or UNI username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              placeholder="Password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        {error ? <p className="inline-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={!canSubmit}>
          {saving ? "Saving credentials..." : "Save and continue"}
        </button>

        <p className="form-note">No demo data is loaded after sign-in.</p>
      </form>
    </div>
  );
}
