import { Providers } from './providers'
import '../src/index.css'

// CRITICAL: Disable static generation for the entire app
// All pages require authentication and React Query, so they must be dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Project Management',
  description: 'An open-source project management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

