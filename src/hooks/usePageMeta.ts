import { useEffect } from "react";
import { APP_DESCRIPTION, buildPageTitle } from "@/lib/brand";

type MetaName = "description" | "robots" | "twitter:title" | "twitter:description";
type MetaProperty = "og:title" | "og:description" | "og:url";

type UsePageMetaOptions = {
  title?: string;
  description?: string;
  noIndex?: boolean;
};

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

export function usePageMeta({ title, description = APP_DESCRIPTION, noIndex = false }: UsePageMetaOptions = {}) {
  useEffect(() => {
    const pageTitle = buildPageTitle(title);
    const pageUrl = window.location.href;

    document.title = pageTitle;
    upsertNamedMeta("description", description);
    upsertNamedMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");
    upsertNamedMeta("twitter:title", pageTitle);
    upsertNamedMeta("twitter:description", description);
    upsertPropertyMeta("og:title", pageTitle);
    upsertPropertyMeta("og:description", description);
    upsertPropertyMeta("og:url", pageUrl);
    upsertCanonical(pageUrl);
  }, [description, noIndex, title]);
}
