import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWAInit from '@ducanh2912/next-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Keep tracing & typecheck rooted in this app when a parent directory has another lockfile. */
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [{ source: '/dates', destination: '/datebook', permanent: true }]
  },
}

export default withPWA(nextConfig)
