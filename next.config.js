/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A running `next start` serves the .next it booted from, so replacing that directory mid-flight
  // breaks its stylesheet URLs. Verification builds set NEXT_DIST_DIR to a scratch directory.
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;
