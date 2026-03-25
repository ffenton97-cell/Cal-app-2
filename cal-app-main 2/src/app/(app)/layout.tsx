import ClientAppShell from '@/components/ClientAppShell'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientAppShell>{children}</ClientAppShell>
}
