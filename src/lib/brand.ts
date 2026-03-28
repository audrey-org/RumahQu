export const APP_NAME = "RumahQu";

export const APP_DESCRIPTION =
  "Kelola inventaris rumah tangga, pantau masa simpan, dan kolaborasi dengan keluarga dalam satu tempat.";

export const APP_TAGLINE = "Kelola stok rumah tanpa ribet";

export function buildPageTitle(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${APP_NAME}` : `${APP_NAME} | Inventaris Rumah Tangga`;
}
