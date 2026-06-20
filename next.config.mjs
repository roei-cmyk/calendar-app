/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Allow Server Actions (e.g. login) to work behind dev tunnels like
    // *.trycloudflare.com / *.ngrok-free.app when sharing the local server.
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        "*.ngrok-free.app",
        "*.loca.lt",
      ],
    },
  },
};

export default nextConfig;
