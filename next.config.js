/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Las respuestas de la API no se cachean nunca: son datos por usuario y por
  // cuenta. Sin esto un intermediario puede guardar una respuesta y devolverla
  // despues (en el peor caso, a otra persona).
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
