import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProductsSlugRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/scripts/${slug}`)
}
