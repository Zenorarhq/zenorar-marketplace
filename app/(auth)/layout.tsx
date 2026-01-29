export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth pages have their own layout, render children directly without main header/footer
  return <>{children}</>
}
