"use client"

import { SharedDocument } from "@/components/shared-document"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface SharedPageProps {
  params: Promise<{ id: string }>
}

export default function SharedPage({ params }: SharedPageProps) {
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      const { id } = await params
      try {
        const docRef = doc(db, "documents", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists() && docSnap.data().isPublic) {
          setDocument({ id: docSnap.id, ...docSnap.data() })
        } else {
          setNotFound(true)
        }
      } catch (error) {
        console.error("Error fetching document:", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [params])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (notFound || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <p className="text-muted-foreground">
            The shared document you're looking for doesn't exist or is no longer public.
          </p>
        </div>
      </div>
    )
  }

  return <SharedDocument document={document} />
}
