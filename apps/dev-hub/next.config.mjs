
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/email-hub/:path*',
        destination: 'http://localhost:5001/email-hub/:path*',
      },
      {
        source: '/push-blaster/:path*',
        destination: 'http://localhost:3001/push-blaster/:path*',
      },
    ];
  },
};

export default nextConfig; 