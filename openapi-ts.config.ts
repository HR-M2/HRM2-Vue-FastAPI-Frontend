import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: 'http://localhost:8000/openapi.json',
  output: {
    path: 'src/api',
    format: 'prettier',
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
})
