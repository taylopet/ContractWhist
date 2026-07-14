// KAN-76: basePath prefix for client-side fetch() and EventSource calls.
// Next.js auto-prefixes <Link> and router.push() but NOT raw fetch().
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const apiPath = (path: string) => `${BASE_PATH}${path}`;
