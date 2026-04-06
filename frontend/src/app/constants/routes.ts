export const ERoutes = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
} as const;

export type ERoutes = (typeof ERoutes)[keyof typeof ERoutes];
