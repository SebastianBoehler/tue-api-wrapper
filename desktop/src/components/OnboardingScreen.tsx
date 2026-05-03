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
      <section className="onboarding-intro">
        <p className="eyebrow">TUE Study Hub</p>
        <h1>Your study day in one place.</h1>
        <p className="lead">
          Sign in with your university account to see your timetable, course work, mail, study records, and
          campus information on this device.
        </p>

        <div className="onboarding-highlights" aria-label="What Study Hub shows after sign-in">
          <div>
            <span>Today</span>
            <strong>Classes, deadlines, and rooms</strong>
          </div>
          <div>
            <span>Learning</span>
            <strong>Alma, ILIAS, Moodle, and mail</strong>
          </div>
          <div>
            <span>Privacy</span>
            <strong>Your login stays encrypted on this device</strong>
          </div>
        </div>
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <p className="eyebrow">Sign in</p>
          <h2>University login</h2>
          <p className="muted">
            Use your ZDV ID and university password. Study Hub connects directly from this app.
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
          {saving ? "Signing in..." : "Continue"}
        </button>

        <p className="form-note">Your credentials are saved encrypted and can be removed from settings at any time.</p>
      </form>
    </div>
  );
}
