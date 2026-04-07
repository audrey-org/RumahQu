import { useEffect } from "react";
import {
  APP_DESCRIPTION,
  DEFAULT_OG_IMAGE_URL,
  buildCanonicalUrl,
  buildPageTitle,
} from "@/lib/brand";

type JsonLd = Record<string, unknown>;
type MetaName =
  | "description"
  | "robots"
  | "twitter:card"
  | "twitter:title"
  | "twitter:description"
  | "twitter:image"
  | "twitter:image:alt";
type MetaProperty =
  | "og:title"
  | "og:description"
  | "og:url"
  | "og:type"
  | "og:image"
  | "og:image:alt";

type UsePageMetaOptions = {
  title?: string;
  description?: string;
  noIndex?: boolean;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  structuredData?: JsonLd[];
};

const STRUCTURED_DATA_SELECTOR = 'script[data-rumahqu-meta="structured-data"]';

function upsertNamedMeta(name: MetaName, content: string) {
  let meta = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function upsertPropertyMeta(property: MetaProperty, content: string) {
  let meta = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

function removeStructuredData() {
  document.head.querySelectorAll(STRUCTURED_DATA_SELECTOR).forEach((script) => script.remove());
}

function appendStructuredData(structuredData: JsonLd[]) {
  for (const entry of structuredData) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.rumahquMeta = "structured-data";
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  }
}

export function usePageMeta({
  title,
  description = APP_DESCRIPTION,
  noIndex = false,
  canonicalPath,
  image = DEFAULT_OG_IMAGE_URL,
  imageAlt = "RumahQu, aplikasi inventaris rumah tangga",
  type = "website",
  structuredData = [],
}: UsePageMetaOptions = {}) {
  useEffect(() => {
    const pageTitle = buildPageTitle(title);
    const pageUrl = buildCanonicalUrl(canonicalPath ?? window.location.pathname);

    document.title = pageTitle;
    upsertNamedMeta("description", description);
    upsertNamedMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");
    upsertNamedMeta("twitter:card", "summary_large_image");
    upsertNamedMeta("twitter:title", pageTitle);
    upsertNamedMeta("twitter:description", description);
    upsertNamedMeta("twitter:image", image);
    upsertNamedMeta("twitter:image:alt", imageAlt);
    upsertPropertyMeta("og:title", pageTitle);
    upsertPropertyMeta("og:description", description);
    upsertPropertyMeta("og:url", pageUrl);
    upsertPropertyMeta("og:type", type);
    upsertPropertyMeta("og:image", image);
    upsertPropertyMeta("og:image:alt", imageAlt);
    upsertCanonical(pageUrl);
    removeStructuredData();
    appendStructuredData(structuredData);

    return () => {
      removeStructuredData();
    };
  }, [canonicalPath, description, image, imageAlt, noIndex, structuredData, title, type]);
}
