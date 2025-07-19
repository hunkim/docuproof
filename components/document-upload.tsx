"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, AlertCircle, CheckCircle, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file || !user) return

      setUploading(true)
      setProgress(0)
      setCurrentStep("Preparing upload...")

      try {
        const formData = new FormData()
        formData.append("file", file)

        // Get Firebase ID token for authentication
        const token = await user.getIdToken()
        setProgress(10)
        setCurrentStep("Uploading document...")

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress((prev: number) => {
            if (prev < 30) return prev + 2
            if (prev < 60) return prev + 1
            if (prev < 90) return prev + 0.5
            return prev
          })
        }, 200)

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const { document } = await response.json()
        
        setProgress(95)
        setCurrentStep("Processing complete!")

        // Show success message with details
        const hasText = document.extractedText && document.extractedText.length > 0
        const chunkCount = document.chunks ? document.chunks.length : 0
        
        toast({
          title: "Upload successful!",
          description: hasText 
            ? `Document processed: ${document.totalWords} words in ${chunkCount} sections`
            : "Document uploaded successfully (text extraction may have failed)",
        })

        setProgress(100)
        setTimeout(() => {
          router.push(`/dashboard/analysis/${document.id}`)
        }, 500)
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "There was an error uploading your document. Please try again.",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
        setProgress(0)
        setCurrentStep("")
      }
    },
    [router, toast, user],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          } ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Upload className="h-12 w-12 text-blue-500 animate-pulse" />
                  <Zap className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">Processing document...</p>
                <Progress value={progress} className="w-full max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground">{currentStep}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {progress < 30 && (
                    <div className="flex items-center justify-center gap-1">
                      <Upload className="h-3 w-3" />
                      <span>Uploading to cloud storage</span>
                    </div>
                  )}
                  {progress >= 30 && progress < 90 && (
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3 text-blue-500" />
                      <span>Extracting text with Upstage AI</span>
                    </div>
                  )}
                  {progress >= 90 && (
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Creating sections for analysis</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? "Drop your document here" : "Upload your document"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Drag and drop your PDF or Word document, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your document will be processed with Upstage AI for optimal text extraction
                </p>
              </div>
              <Button variant="outline">Choose File</Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>Supports PDF, DOC, and DOCX files up to 10MB</span>
              </div>
              
              {/* Feature highlights */}
              <div className="border-t pt-4 mt-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-blue-500" />
                    <span>Powered by Upstage Document Parser</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-3 w-3 text-green-500" />
                    <span>Automatic section detection (less than 1000 words each)</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-3 w-3 text-purple-500" />
                    <span>AI-powered proofreading with Solar LLM</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
