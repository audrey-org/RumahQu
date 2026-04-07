export const APP_NAME = "RumahQu";
export const APP_SITE_URL = "https://rumahqu.web.id";
export const APP_LOCALE = "id_ID";
export const APP_LANGUAGE = "id-ID";

export const APP_DESCRIPTION =
  "Kelola inventaris rumah tangga, pantau masa simpan, dan kolaborasi dengan keluarga dalam satu tempat.";

export const APP_TAGLINE = "Kelola stok rumah tanpa ribet";
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";
export const DEFAULT_OG_IMAGE_URL = new URL(DEFAULT_OG_IMAGE_PATH, APP_SITE_URL).toString();
export const DEFAULT_LOGO_URL = new URL("/icon-512.png", APP_SITE_URL).toString();

export function buildPageTitle(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${APP_NAME}` : `${APP_NAME} | Inventaris Rumah Tangga`;
}

export function buildCanonicalUrl(pathname = "/") {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, APP_SITE_URL).toString();
}
