import { notFound, redirect } from "next/navigation";
import DocsPage from "@/components/docs/DocsPage";
import { DOCS_SLUGS, STELLAR_BLOCKED_SLUGS, getDocPage } from "@/lib/docs-content";
import { IS_STELLAR_MODE } from "@/lib/app-config";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return DOCS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = getDocPage(slug);

  if (!page) {
    return {
      title: "Docs - DRIP",
    };
  }

  return {
    title: `${page.title} - DRIP Docs`,
    description: page.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  if (IS_STELLAR_MODE && STELLAR_BLOCKED_SLUGS.includes(slug)) {
    redirect("/docs");
  }

  const page = getDocPage(slug);

  if (!page || page.slug === "overview") {
    notFound();
  }

  return <DocsPage page={page} />;
}
