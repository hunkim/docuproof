"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DocumentAnalysis } from "@/components/document-analysis"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { user, loading } = useAuth()
  const [document, setDocument] = useState<any>(null)
  const [documentLoading, setDocumentLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchDocument = async () => {
      const { id } = await params
      if (!user) return

      try {
        const docRef = doc(db, "documents", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists() && docSnap.data().userId === user.uid) {
          setDocument({ id: docSnap.id, ...docSnap.data() })
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching document:", error)
        router.push("/")
      } finally {
        setDocumentLoading(false)
      }
    }

    if (!loading && user) {
      fetchDocument()
    } else if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, params, router])

  if (loading || documentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <p className="text-muted-foreground">
            The document you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <DocumentAnalysis document={document} />
    </DashboardLayout>
  )
}
