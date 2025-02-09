/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'ws': 'commonjs ws'
    })
    return config
  },
  experimental: {
    esmExternals: 'loose'
  }
}

export default nextConfig