'use client'

import { useParams } from 'next/navigation'
import BlogPostForm from '@/components/admin/BlogPostForm'

export default function EditBlogPostPage() {
  const params = useParams()
  return <BlogPostForm postId={params.id as string} />
}