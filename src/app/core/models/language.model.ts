/** The two languages the app ships. A type, not a service concern: a pipe formatting a date needs
 *  it without pulling in the service that switches it. */
export type AppLanguage = 'en' | 'bn';

export const APP_LANGUAGES: readonly AppLanguage[] = ['en', 'bn'];
