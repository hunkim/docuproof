"use client"

import { useAuth } from "@/components/auth-provider"
import { LandingPage } from "@/components/landing-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DocumentUpload } from "@/components/document-upload"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to DocuProof</h1>
            <p className="text-muted-foreground">
              Upload your document to get started with AI-powered proofreading and consistency checking
            </p>
          </div>
          <DocumentUpload />
        </div>
      </div>
    </DashboardLayout>
  )
}
