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

export default async function About({
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
      <h1 className="text-2xl font-semibold">About {biz.name}</h1>
      <p className="mt-3 text-muted-foreground">
        {biz.name} provides business services and support for clients in the United States. This website is intended to
        display official business information and contact details.
      </p>
      <p className="mt-3 text-muted-foreground">
        For official inquiries, please refer to the Contact page.
      </p>

      <div className="mt-6">
        <a className="underline underline-offset-4" href="/">
          ← Back to Home
        </a>
      </div>
    </main>
  );
}
