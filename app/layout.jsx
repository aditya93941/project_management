import { Providers } from './providers'
import '../src/index.css'

// CRITICAL: Disable static generation for the entire app
// All pages require authentication and React Query, so they must be dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Position2 | Internal Project Management',
  description: 'Position2 internal project management platform. Manage projects, tasks, and teams with role-based permissions, EOD reports, analytics, and workspace collaboration.',
  icons: {
    icon: '/icon.svg',
  },
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

