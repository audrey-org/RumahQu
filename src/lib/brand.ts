export const APP_NAME = "RumahQu";
export const APP_SITE_URL = "https://rumahqu.web.id";
export const APP_LOCALE = "id_ID";
export const APP_LANGUAGE = "id-ID";

export const APP_DESCRIPTION =
  "Aplikasi gratis untuk mengelola stok rumah tangga, memantau masa simpan bahan, dan belanja lebih hemat bersama keluarga.";

export const APP_TAGLINE = "Cek stok rumah, belanja lebih hemat";
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
