export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
