// Archived: src/components/Layout.tsx
// Moved to archive by automated cleanup.

import React from 'react'

interface LayoutProps { children?: React.ReactNode; title?: string }

export const Layout: React.FC<LayoutProps> = ({ children, title }) => (
  <div>
    <header>
      <h1>{title ?? 'Archived Layout'}</h1>
    </header>
    <main>{children}</main>
  </div>
)

export default Layout
