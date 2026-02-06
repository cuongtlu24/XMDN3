import type { BizRecord } from "@/lib/sheet";

// ✅ FB-friendly: content must be visible (no display:none / aria-hidden)
export default function BusinessCard({ biz }: { biz: BizRecord }) {
  const desc =
    biz.description ||
    "This website provides official business information, contact details, and support for inquiries.";

  // ✅ Tự tạo email theo subdomain/slug (hoặc dùng biz.email nếu sau này bạn có field đó)
  const sub =
    (biz as any).slug ||
    (biz as any).subdomain ||
    ""; // fallback

  const email =
    (biz as any).email ||
    (sub ? `email@${sub}.bmverification.com` : "");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
          {biz.name}
        </h1>
        <p className="mt-2 text-sm md:text-base text-muted-foreground">{desc}</p>
      </header>

      <section className="rounded-2xl border bg-card p-5 md:p-6 shadow-sm">
        <h2 className="text-base md:text-lg font-semibold">
          Business Information
        </h2>

        <div className="mt-4 grid gap-4 text-sm md:text-base">
          <div>
            <div className="font-semibold">Address</div>
            <div className="text-muted-foreground">{biz.address || "N/A"}</div>
          </div>

          <div>
            <div className="font-semibold">Business phone</div>
            <div className="text-muted-foreground">{biz.phone || "N/A"}</div>
          </div>

          {/* ✅ NEW: Email */}
          <div>
            <div className="font-semibold">Email</div>
            <div className="text-muted-foreground">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="underline underline-offset-4"
                >
                  {email}
                </a>
              ) : (
                "N/A"
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold">Website</div>
            <div className="text-muted-foreground">
              {biz.website ? (
                <a
                  href={biz.website}
                  rel="nofollow noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {biz.website}
                </a>
              ) : (
                "N/A"
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold">Tax ID</div>
            <div className="text-muted-foreground">{biz.taxId || "N/A"}</div>
          </div>
        </div>
      </section>

      <nav className="mt-6 flex gap-4 text-sm">
        <a className="underline underline-offset-4" href="/about">
          About
        </a>
        <a className="underline underline-offset-4" href="/contact">
          Contact
        </a>
      </nav>

      <footer className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {biz.name}. All rights reserved.
      </footer>
    </main>
  );
}
