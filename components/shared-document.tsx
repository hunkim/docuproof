"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertTriangle, FileText } from "lucide-react"
import { diffWords } from 'diff'

// Convert HTML to minimal text rendering
function htmlToMinimalText(text: string): string {
  if (!text) return text
  
  return text
    // Convert common HTML elements to plain text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '')
    // Remove other HTML tags
    .replace(/<[^>]*>/g, '')
    // Convert HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace but preserve intentional line breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

// Render text with preserved line breaks
function renderMinimalText(text: string, className?: string) {
  const cleanText = htmlToMinimalText(text)
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {cleanText}
    </span>
  )
}

// Create minimal word-level diff using professional diff library
function createInlineTrackChanges(original: string, suggested: string) {
  if (!original || !suggested) {
    return renderMinimalText(suggested || original, "text-gray-800")
  }

  // Clean HTML to minimal text for both versions
  const cleanOriginal = htmlToMinimalText(original)
  const cleanSuggested = htmlToMinimalText(suggested)

  // If they're identical after cleaning, just show the text
  if (cleanOriginal.trim() === cleanSuggested.trim()) {
    return renderMinimalText(cleanOriginal, "text-gray-800")
  }

  // Use the professional diff library for optimal word-level diffing
  const changes = diffWords(cleanOriginal, cleanSuggested)
  const result = []
  let keyCounter = 0

  for (const change of changes) {
    const key = `diff-${keyCounter++}`

    if (change.added) {
      result.push(
        <span key={key} className="text-green-600 bg-green-50 px-1 rounded font-medium" style={{ whiteSpace: 'pre-wrap' }}>
          {change.value}
        </span>
      )
    } else if (change.removed) {
      result.push(
        <span key={key} className="text-red-600 line-through bg-red-50 px-1 rounded" style={{ whiteSpace: 'pre-wrap' }}>
          {change.value}
        </span>
      )
    } else {
      // Unchanged text
      result.push(
        <span key={key} className="text-gray-800" style={{ whiteSpace: 'pre-wrap' }}>
          {change.value}
        </span>
      )
    }
  }

  return <>{result}</>
}

// Section comparison component showing inline diff + clean version
function SectionComparison({ 
  original, 
  cleanVersion, 
  suggestions, 
  explanation 
}: { 
  original: string; 
  cleanVersion: string; 
  suggestions: any[]; 
  explanation?: string; 
}) {
  return (
    <div className="space-y-6">
      {/* Inline Track Changes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-blue-600">🔧 Track Changes</div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {suggestions.length} improvement{suggestions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <div className="text-sm text-gray-800 leading-relaxed">
            {createInlineTrackChanges(original, cleanVersion)}
          </div>
        </div>
      </div>

      {/* Clean Version for Copy-Paste */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium text-green-600">✅ Clean Version</div>
            <span className="text-xs text-gray-500">Minimal text rendering</span>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(htmlToMinimalText(cleanVersion))}
            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
          >
            📋 Copy Text
          </button>
        </div>
        <div className="p-4 bg-white border border-green-200 rounded-lg shadow-sm">
          <div className="text-sm text-gray-800 leading-relaxed select-all">
            {renderMinimalText(cleanVersion)}
          </div>
        </div>
      </div>

      {/* Summary of Changes */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm font-medium text-blue-800">💡 Summary of improvements:</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-blue-900">{suggestion.issue || suggestion.type}</span>
                  {suggestion.type && suggestion.issue !== suggestion.type && (
                    <span className="ml-1 text-blue-600">({suggestion.type.replace('_', ' ')})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
            {results.sections
              .filter((section: any) => {
                // Only show sections with actual changes
                return section.suggestions?.length > 0 && 
                       htmlToMinimalText(section.original || '').trim() !== htmlToMinimalText(section.cleanVersion || '').trim()
              }).length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-600 mb-2">Document looks great!</h3>
                <p className="text-gray-600">
                  No changes were needed during the analysis.
                </p>
              </div>
            ) : (
              results.sections
                .filter((section: any) => {
                  // Only show sections with actual changes
                  return section.suggestions?.length > 0 && 
                         htmlToMinimalText(section.original || '').trim() !== htmlToMinimalText(section.cleanVersion || '').trim()
                })
                .map((section: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>{section.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {section.suggestions?.length || 0} changes
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SectionComparison
                        original={section.original || ''}
                        cleanVersion={section.cleanVersion || ''}
                        suggestions={section.suggestions || []}
                        explanation={section.explanation}
                      />
                    </CardContent>
                  </Card>
                ))
            )}
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium text-green-600">✅ Clean Version</div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(htmlToMinimalText(section.cleanVersion || ''))}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                      >
                        📋 Copy Text
                      </button>
                    </div>
                    <div className="p-4 bg-white border border-green-200 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-800 leading-relaxed select-all">
                        {renderMinimalText(section.cleanVersion || '')}
                      </div>
                    </div>
                    {section.explanation && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">{section.explanation}</p>
                      </div>
                    )}
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
