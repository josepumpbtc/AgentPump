/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway deployment optimizations
  output: 'standalone',
  // Enable environment variable validation
  env: {
    NEXT_PUBLIC_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
    NEXT_PUBLIC_WALLET_CONNECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID,
  },
}

module.exports = nextConfig
