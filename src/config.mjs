import path from 'path'
import { fileURLToPath } from 'url'

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)

export const uiSrcDir = path
  .join(__dirname, '../../minio-console/portal-ui/src/')
  .replace(/\\/g, '/')

let targetPath = '**/*.tsx'
// targetPath = 'common/Copyright.tsx'

export const target = `${uiSrcDir}${targetPath}`
