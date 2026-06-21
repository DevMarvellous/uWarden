import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — uWarden",
  description: "How the uWarden browser extension collects, uses, and stores your data.",
};

export default function Privacy() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <div className="legal-mark">
          <Link href="/">⚖ uWarden</Link>
          <span>Privacy Policy</span>
        </div>

        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: June 21, 2026</p>

        <p className="legal-lead">
          uWarden is a browser extension that blocks sites you choose and shows
          an AI-generated message when you try to open them. This policy
          explains exactly what data the extension handles, why, and who it is
          shared with. We do not sell your data and we do not run ad tracking.
        </p>

        <h2 className="legal-h2">What we collect</h2>
        <p className="legal-p">When you set up and use uWarden, we store:</p>
        <ul className="legal-list">
          <li>
            <strong>Your email address</strong> — obtained when you sign in with
            Google. We use it to identify your account. We never receive or
            store your Google password.
          </li>
          <li>
            <strong>Your work goal</strong> — the short text you enter during
            onboarding, used to personalize the messages you see.
          </li>
          <li>
            <strong>Your blocklist</strong> — the site names (hostnames) you
            choose to block.
          </li>
          <li>
            <strong>Block events</strong> — when you open a site you&apos;ve
            blocked, we log the site name, the time, the message that was shown,
            and whether you chose to override the block. This powers your stats
            and streak.
          </li>
        </ul>

        <h2 className="legal-h2">What we do NOT collect</h2>
        <p className="legal-p">
          uWarden only acts on the specific sites you have added to your
          blocklist. It does not record, store, or transmit your general
          browsing history, the contents of pages you visit, your keystrokes,
          or any site you have not explicitly chosen to block.
        </p>

        <h2 className="legal-h2">Third parties</h2>
        <p className="legal-p">
          To generate a personalized message when you open a blocked site, we
          send limited context — the blocked site&apos;s name, your work goal,
          the time of day, and how many times you&apos;ve hit a blocked site
          that day — to Google&apos;s Gemini AI through our own server endpoint.
          This is used solely to produce the message text and is not used for
          advertising. Authentication and data storage are handled by Supabase.
        </p>

        <h2 className="legal-h2">Where your data lives</h2>
        <p className="legal-p">
          Account, blocklist, and block-event data are stored in a Supabase
          (PostgreSQL) database, protected by row-level security so each
          account can only access its own data. Your settings are also cached
          locally in your browser so the extension works quickly.
        </p>

        <h2 className="legal-h2">Deleting your data</h2>
        <p className="legal-p">
          You can remove blocked sites at any time from the extension. To delete
          your account and all associated data, email us at the address below
          and we will remove it.
        </p>

        <h2 className="legal-h2">Contact</h2>
        <p className="legal-p">
          Questions about this policy or your data? Email{" "}
          <a href="mailto:mofedev404@gmail.com">mofedev404@gmail.com</a>.
        </p>

        <div className="legal-footer">
          <Link href="/">← Back to uWarden</Link>
        </div>
      </article>
    </main>
  );
}
