import BusinessCard from "@/components/BusinessCard";
import { fetchBizRecords } from "@/lib/sheet";
import { resolveWantedSlug } from "@/lib/resolve";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function extractFbToken(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  // If the cell contains a full meta tag, extract the content.
  const m = s.match(/content\s*=\s*"([^"]+)"/i);
  return (m?.[1] || s).trim();
}

export async function generateMetadata({ searchParams }: Props) {
  const sp = await searchParams;
  const wanted = await resolveWantedSlug(sp);
  const slug = wanted || "";

  const records = await fetchBizRecords();
  const rec = records.find((r) => r.slug === slug);

  if (!rec) {
    return {
      title: "Business details",
    };
  }

  const fbToken = extractFbToken(rec.fbDomainVerificationHtml);

  return {
    title: rec.businessName || "Business details",
    description: `Business details for ${rec.slug}`,
    other: fbToken
      ? {
          "facebook-domain-verification": fbToken,
        }
      : {},
  };
}

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;
  const wanted = await resolveWantedSlug(sp);
  const slug = wanted || "";

  const records = await fetchBizRecords();
  const rec = records.find((r) => r.slug === slug);

  if (!rec) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h1 className="text-2xl font-semibold text-gray-900">
            Business details
          </h1>
          <p className="mt-4 text-gray-700">
            No record was found for this subdomain.
          </p>
          <p className="mt-2 text-gray-600">
            Tip: make sure your Google Sheet contains the correct value in
            column A (Subdomain) and that the hostname matches it.
          </p>
        </div>
      </main>
    );
  }

  return <BusinessCard biz={rec} />;
}
