import { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy | Tushar Agrawal",
  description: "Privacy policy for tusharagrawal.in — what data is collected, how cookies are used, and your choices.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy | Tushar Agrawal",
    description: "Privacy policy for tusharagrawal.in — what data is collected, how cookies are used, and your choices.",
    url: "/privacy",
    type: "website",
    siteName: "Tushar Agrawal",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Tushar Agrawal",
    description: "Privacy policy for tusharagrawal.in — what data is collected, how cookies are used, and your choices.",
  },
};

export default function PrivacyPage() {
  const updated = "June 2026";
  const breadcrumbSchema = breadcrumbJsonLd([{ name: "Privacy Policy", path: "/privacy" }]);
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="clay-container pt-32 pb-24 max-w-3xl">
        <p className="clay-eyebrow mb-4">Legal</p>
        <h1 className="clay-h2 mb-3">Privacy Policy</h1>
        <p className="text-theme-secondary mb-12">Last updated: {updated}</p>

        <div className="clay-prose">
          <p>
            This Privacy Policy explains how <strong>tusharagrawal.in</strong> (&ldquo;the site&rdquo;) handles
            information when you visit. The site is a personal portfolio operated by Tushar Agrawal.
          </p>

          <h2>Information collected</h2>
          <p>
            The site does not require you to create an account or submit personal information to browse. Some
            information is collected automatically for security and analytics:
          </p>
          <ul>
            <li><strong>Usage data</strong> — pages visited, referring URLs, approximate region, device and browser type.</li>
            <li><strong>Contact data</strong> — only if you choose to email, call, or submit a form, in which case you share it voluntarily.</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            The site uses a small number of cookies. <strong>Essential cookies</strong> keep the site working
            (for example, remembering your theme and your cookie choice). <strong>Optional analytics cookies</strong>
            help understand aggregate traffic so the site can be improved. When you first visit, a banner lets you
            <em> accept</em> or <em>decline</em> the optional cookies; your choice is stored for a year and can be
            changed by clearing the <code>cookie-consent</code> cookie in your browser.
          </p>

          <h2>How data is used</h2>
          <ul>
            <li>To operate, secure, and improve the site.</li>
            <li>To understand which content is useful.</li>
            <li>To respond to you if you reach out directly.</li>
          </ul>
          <p>Your data is never sold.</p>

          <h2>Third-party services</h2>
          <p>
            The site may use privacy-respecting analytics and is hosted on a third-party platform (Vercel). These
            providers process limited technical data on our behalf under their own privacy terms.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>Decline optional cookies via the consent banner.</li>
            <li>Use your browser settings to block or delete cookies.</li>
            <li>Contact us to ask about any information you&apos;ve shared directly.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions about this policy? Email{" "}
            <a href="mailto:tusharagrawal0104@gmail.com">tusharagrawal0104@gmail.com</a>.
          </p>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/" className="clay-link">← Back home</Link>
        </div>
      </div>
    </div>
  );
}
