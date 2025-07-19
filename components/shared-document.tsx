"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertTriangle, FileText } from "lucide-react"

interface SharedDocumentProps {
  document: {
    id: string
    filename: string
    analysisResults: any
  }
}

export function SharedDocument({ document }: SharedDocumentProps) {
  const results = document.analysisResults || {
    sections: [],
    overallSummary: "No analysis results available.",
    consistencyIssues: [],
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">DocuProof</h1>
          </div>
          <h2 className="text-xl text-gray-600 mb-2">{document.filename}</h2>
          <p className="text-muted-foreground">Shared Document Analysis</p>
        </div>

        {/* Results */}
        <Tabs defaultValue="suggestions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">Edit Suggestions</TabsTrigger>
            <TabsTrigger value="clean">Clean Version</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4">
            {results.sections.map((section: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {section.suggestions?.map((suggestion: any, suggestionIndex: number) => (
                      <div key={suggestionIndex} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={suggestion.type === "grammar" ? "destructive" : "secondary"}>
                            {suggestion.type}
                          </Badge>
                          <span className="text-sm font-medium">{suggestion.issue}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-red-600 mb-1">Original:</p>
                            <p className="bg-red-50 p-2 rounded">{suggestion.original}</p>
                          </div>
                          <div>
                            <p className="font-medium text-green-600 mb-1">Suggested:</p>
                            <p className="bg-green-50 p-2 rounded">{suggestion.suggested}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="clean" className="space-y-4">
            {results.sections.map((section: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p>{section.cleanVersion}</p>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{section.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{results.overallSummary}</p>

                {results.consistencyIssues?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Consistency Issues
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {results.consistencyIssues.map((issue: string, index: number) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold">DocuProof</span> - Professional Document Analysis
          </p>
        </div>
      </div>
    </div>
  )
}
