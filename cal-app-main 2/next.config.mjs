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
  /** Keep tracing & project root detection anchored here when parent dirs have lockfiles. */
  outputFileTracingRoot: __dirname,
  experimental: {
    workspaceRoot: __dirname,
  },
  async redirects() {
    return [{ source: '/dates', destination: '/datebook', permanent: true }]
  },
}

const wrappedConfig = withPWA(nextConfig)
// Ensure these survive the withPWA wrapping
wrappedConfig.outputFileTracingRoot = __dirname
if (!wrappedConfig.experimental) wrappedConfig.experimental = {}
wrappedConfig.experimental.workspaceRoot = __dirname

export default wrappedConfig
