import type { AppEnvironment } from '../env.ts';
/**
 * Orange band for the top of the page while the app uses the dev project ("Pruebas"), so test
 * data is never mistaken for real data. Renders nothing in production. While it is shown, the
 * --kit-env-banner-height CSS variable gives its height (for sticky headers: top: var(--kit-env-banner-height, 0)).
 */
export declare function EnvBanner({ environment }: {
    environment: AppEnvironment;
}): import("react").JSX.Element | null;
