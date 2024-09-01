/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/voice-notes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
