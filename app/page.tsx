
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import BusinessCard from "@/components/BusinessCard";
import LandingClient from "./LandingClient";

import { fetchBizRecords } from "@/lib/sheet";
import { normalizeSlugCell, resolveWantedSlug } from "@/lib/resolve";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type SearchParams = Record<string, string | string[] | undefined>;

// ✅ Meta facebook-domain-verification theo subdomain hoặc ?__sub=
export async function generateMetadata({
  searchParams,
}: {
  // ✅ Next 15/16: searchParams thường là Promise
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  noStore();

  const sp = await searchParams;

  const wanted = await resolveWantedSlug(sp);
  if (!wanted) return {};

  try {
    const rows = await fetchBizRecords();
    const biz = rows.find((r) => normalizeSlugCell(r.slug) === wanted);
    const token = biz?.fbToken || "";
    return token ? { other: { "facebook-domain-verification": token } } : {};
  } catch {
    return {};
  }
}

export default async function Home({
  searchParams,
}: {
  // ✅ Next 15/16: searchParams thường là Promise
  searchParams: Promise<SearchParams>;
}) {
  noStore();

  const sp = await searchParams;
  const wanted = await resolveWantedSlug(sp);

  // Apex domain -> trang giới thiệu chung
  if (!wanted) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Business Directory</h1>
        <p className="mt-2 text-muted-foreground">
          This site serves business pages by subdomain. Please open the correct
          subdomain to view business details.
        </p>

        {/* ✅ Tip: test nhanh bằng __sub */}
        <p className="mt-4 text-sm text-muted-foreground">
          Tip: You can test with <code>?__sub=cuongpham</code>
        </p>
      </main>
    );
  }

  const list = await fetchBizRecords();
  const biz = list.find((r) => normalizeSlugCell(r.slug) === wanted);
  if (!biz) return notFound();

  // ✅ Data for old LandingClient UI (optional)
  const bizDataForClient = {
    subdomain: biz.slug || wanted,
    name: biz.name || "N/A",
    address: biz.address || "N/A",
    document: biz.taxId || "N/A",
    phone: biz.phone || "N/A",
    image: biz.image || "",
    // nếu LandingClient có dùng website, bạn thêm:
    // website: biz.website || "N/A",
  };

return (
  <>
    {/* ✅ Keep your existing UI first */}
    <LandingClient bizData={bizDataForClient} />

    {/* ✅ FB-friendly: visible business information (SSR) */}
    <BusinessCard biz={biz} />
  </>
);

}
