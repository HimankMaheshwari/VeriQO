import fs from 'fs'
import path from 'path'

/**
 * Robust helper to retrieve the Google Gemini API key.
 *
 * Checks:
 * 1. process.env.GEMINI_API_KEY
 * 2. process.env.GOOGLE_API_KEY
 * 3. Direct disk read of .env.local (so key additions take effect immediately without restarting server)
 * 4. Direct disk read of .env
 */
export function getGeminiApiKey(): string | undefined {
  let key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
  if (key) return key

  const candidateFiles = ['.env.local', '.env']

  for (const filename of candidateFiles) {
    try {
      const filePath = path.join(process.cwd(), filename)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        const match = content.match(/^(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/m)
        if (match && match[1]?.trim()) {
          key = match[1].trim()
          process.env.GEMINI_API_KEY = key
          return key
        }
      }
    } catch {
      // Ignore file reading errors
    }
  }

  return undefined
}
