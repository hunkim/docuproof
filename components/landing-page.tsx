"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Zap, Share2, CheckCircle } from "lucide-react"
import { GoogleSignIn } from "@/components/google-sign-in"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">DocuProof</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Professional AI-powered document proofreading and consistency checking. Upload your PDFs and Word documents
            for instant analysis and improvement suggestions.
          </p>
          <GoogleSignIn />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Multi-Format Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Upload PDF and Word documents with drag & drop functionality</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Real-time Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Get instant feedback with streaming AI analysis and progress tracking</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Comprehensive Checking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Grammar, spelling, style, and consistency checking in one place</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Share2 className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Share analysis results with colleagues and collaborators</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Upload Document</h3>
              <p className="text-gray-600">
                Drag and drop your PDF or Word document, or click to select from your device
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">AI Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your document section by section, providing real-time feedback
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Review & Share</h3>
              <p className="text-gray-600">
                Review suggestions, download the clean version, and share results with others
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
