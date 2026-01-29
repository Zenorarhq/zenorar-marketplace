export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Checkout has its own header/footer, so we render children directly
  return <>{children}</>
}
