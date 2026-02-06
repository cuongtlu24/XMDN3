import type { Metadata } from "next";
import { noStore } from "next/cache";
import { notFound } from "next/navigation";

import { fetchBizRecords } from "@/lib/sheet";
import { normalizeSlugCell, resolveWantedSlug } from "@/lib/resolve";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, any>;
}): Promise<Metadata> {
  noStore();
  const wanted = await resolveWantedSlug(searchParams);
  if (!wanted) return {};

  try {
    const list = await fetchBizRecords();
    const biz = list.find((r) => normalizeSlugCell(r.slug) === wanted);
    const token = biz?.fbToken || "";
    return token ? { other: { "facebook-domain-verification": token } } : {};
  } catch {
    return {};
  }
}

export default async function Contact({
  searchParams,
}: {
  searchParams?: Record<string, any>;
}) {
  noStore();

  const wanted = await resolveWantedSlug(searchParams);
  if (!wanted) return notFound();

  const list = await fetchBizRecords();
  const biz = list.find((r) => normalizeSlugCell(r.slug) === wanted);
  if (!biz) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Contact</h1>

      <h2 className="mt-5 text-lg font-semibold">{biz.name}</h2>

      <div className="mt-4 grid gap-3 text-sm md:text-base">
        <div>
          <div className="font-semibold">Address</div>
          <div className="text-muted-foreground">{biz.address || "N/A"}</div>
        </div>

        <div>
          <div className="font-semibold">Business phone</div>
          <div className="text-muted-foreground">{biz.phone || "N/A"}</div>
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
      </div>

      <p className="mt-6 text-muted-foreground">
        For inquiries, please contact us via phone or visit our website.
      </p>

      <div className="mt-6">
        <a className="underline underline-offset-4" href="/">
          ← Back to Home
        </a>
      </div>
    </main>
  );
}
