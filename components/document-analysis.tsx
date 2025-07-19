"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Share2, Download, Play, CheckCircle, FileText, Zap, Info, BookOpen, Wrench } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { diffWords } from 'diff'

// Create minimal word-level diff using professional diff library
function createInlineTrackChanges(original: string, suggested: string) {
  if (!original || !suggested) {
    return <span className="text-gray-800">{suggested || original}</span>
  }

  // If they're identical, just show the text (though this shouldn't happen with our filtering)
  if (original.trim() === suggested.trim()) {
    return <span className="text-gray-800">{original}</span>
  }

  // Use the professional diff library for optimal word-level diffing
  const changes = diffWords(original, suggested)
  const result = []
  let keyCounter = 0

  for (const change of changes) {
    const key = `diff-${keyCounter++}`

    if (change.added) {
      result.push(
        <span key={key} className="text-green-600 bg-green-50 px-1 rounded font-medium">
          {change.value}
        </span>
      )
    } else if (change.removed) {
      result.push(
        <span key={key} className="text-red-600 line-through bg-red-50 px-1 rounded">
          {change.value}
        </span>
      )
    } else {
      // Unchanged text
      result.push(
        <span key={key} className="text-gray-800">
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
            <span className="text-xs text-gray-500">Ready to copy</span>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(cleanVersion)}
            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
          >
            📋 Copy Text
          </button>
        </div>
        <div className="p-4 bg-white border border-green-200 rounded-lg shadow-sm">
          <div className="text-sm text-gray-800 leading-relaxed select-all">
            {cleanVersion}
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

interface DocumentAnalysisProps {
  document: {
    id: string
    filename: string
    status: string
    filePath: string
    chunks?: Array<{
      title: string
      content: string
      wordCount: number
    }>
    totalWords?: number
    analysisResults?: AnalysisResult
  }
}

interface AnalysisResult {
  sections: Array<{
    title: string
    original: string
    wordCount: number
    suggestions: Array<{
      type: string
      issue: string
      original: string
      suggested: string
      explanation: string
    }>
    cleanVersion: string
    explanation: string
    consistencyIssues?: Array<{
      type: string
      issue: string
      original: string
      suggested: string
      explanation: string
    }>
    missingInformation?: Array<{
      location: string
      gap: string
      suggestion: string
      reasoning: string
    }>
    proofreadingFixes?: Array<{
      type: string
      original: string
      suggested: string
      explanation: string
    }>
  }>
  overallSummary: string
  consistencyIssues: string[]
  totalWords: number
  completedAt: string
  analysisType?: string
}



export function DocumentAnalysis({ document }: DocumentAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResult | null>(document.analysisResults || null)
  const [currentSection, setCurrentSection] = useState<string>("")
  const [processedSections, setProcessedSections] = useState<Array<any>>([])
  const [changeLevel, setChangeLevel] = useState<'minor' | 'major'>('minor')
  const [previousLevel, setPreviousLevel] = useState<'minor' | 'major' | null>(
    document.analysisResults ? 'minor' : null // Default to minor if existing results
  )
  const { toast } = useToast()
  const { user } = useAuth()

  const startAnalysis = async () => {
    if (!user) return

    setAnalyzing(true)
    setProgress(0)
    setCurrentSection("Starting analysis...")
    setProcessedSections([])
    setResults(null) // Clear previous results when starting new analysis

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          changeLevel: changeLevel,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Analysis API error:', errorText)
        throw new Error("Analysis failed")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      const sectionsWithSuggestions: any[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              switch (data.type) {
                case 'start':
                  setCurrentSection(data.message)
                  break
                  
                case 'progress':
                  setCurrentSection(data.message)
                  const progressPercent = Math.round((data.currentSection / data.totalSections) * 90) // Leave 10% for completion
                  setProgress(progressPercent)
                  break
                  
                case 'section':
                  const section = data.section
                  console.log(`✅ Section received: "${section.title}" - ${section.suggestions?.length || 0} suggestions`)
                  
                  // Add to processed sections list
                  setProcessedSections(prev => [...prev, section])
                  
                  // If this section has suggestions, add it to results immediately
                  if (section.suggestions && section.suggestions.length > 0) {
                    sectionsWithSuggestions.push(section)
                    
                    // Update results to show immediately
                    setResults(prevResults => ({
                      sections: sectionsWithSuggestions,
                      totalWords: sectionsWithSuggestions.reduce((sum, s) => sum + (s.wordCount || 0), 0),
                      completedAt: new Date().toISOString(),
                      overallSummary: `Analysis in progress... Found ${sectionsWithSuggestions.length} sections with suggestions so far.`,
                      consistencyIssues: [],
                      analysisType: "context-aware-analysis"
                    }))
                  }
                  
                  setProgress(data.progress || 0)
                  break
                  
                case 'complete':
                  setResults(data.finalResult)
                  setProgress(100)
                  setCurrentSection("Analysis complete!")
                  setPreviousLevel(changeLevel) // Remember the level used for this analysis
                  
                  toast({
                    title: `${changeLevel.charAt(0).toUpperCase() + changeLevel.slice(1)} Analysis Complete`,
                    description: data.message || `${changeLevel.charAt(0).toUpperCase() + changeLevel.slice(1)} analysis completed successfully!`,
                  })
                  break
                  
                case 'error':
                  throw new Error(data.message || 'Analysis failed')
              }
            } catch (e) {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Analysis error:', error)
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "There was an error analyzing your document.",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const shareDocument = async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, "documents", document.id), {
        isPublic: true,
        updatedAt: new Date(),
      })

      const shareUrl = `${globalThis.location.origin}/shared/${document.id}`
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not copy share link.",
        variant: "destructive",
      })
    }
  }

  const downloadReport = () => {
    if (!results) return

    const reportData = {
      filename: document.filename,
      analyzedAt: results.completedAt,
      totalWords: results.totalWords,
      sectionsAnalyzed: results.sections.length,
      totalSuggestions: results.sections.reduce((sum: number, s: any) => sum + s.suggestions.length, 0),
      overallSummary: results.overallSummary,
      analysisType: results.analysisType,
      sections: results.sections
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = globalThis.document.createElement('a')
    a.href = url
    a.download = `${document.filename}_analysis_report.json`
    globalThis.document.body.appendChild(a)
    a.click()
    globalThis.document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }



  return (
          <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{document.filename}</h1>
            <div className="text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Context-Aware Document Analysis 
              {document.totalWords && (
                <span className="text-sm">• {document.totalWords.toLocaleString()} words</span>
              )}
              {document.chunks && (
                <span className="text-sm">• {document.chunks.length} sections</span>
              )}
              {results?.analysisType && (
                <Badge variant="outline" className="ml-2">
                  {results.analysisType.replace('-', ' ')}
                </Badge>
              )}
              {results && (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${
                    (previousLevel || 'minor') === 'minor' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}
                >
                  {previousLevel || 'minor'} level
                </Badge>
              )}
            </div>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shareDocument} disabled={!results}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={downloadReport} disabled={!results}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Analysis Overview */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Analysis Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {results.sections
                    .filter(s => s.original?.trim() !== s.cleanVersion?.trim())
                    .flatMap(s => s.consistencyIssues || []).length}
                </div>
                <div className="text-sm text-blue-600 flex items-center justify-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Consistency
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-xl font-bold text-orange-600">
                  {results.sections
                    .filter(s => s.original?.trim() !== s.cleanVersion?.trim())
                    .flatMap(s => s.missingInformation || []).length}
                </div>
                <div className="text-sm text-orange-600 flex items-center justify-center gap-1">
                  <Info className="h-3 w-3" />
                  Missing Info
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">
                  {results.sections
                    .filter(s => s.original?.trim() !== s.cleanVersion?.trim())
                    .flatMap(s => s.proofreadingFixes || []).length}
                </div>
                <div className="text-sm text-red-600 flex items-center justify-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Proofreading
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {results.sections.filter(s => 
                    !s.suggestions || 
                    s.suggestions.length === 0 || 
                    s.original?.trim() === s.cleanVersion?.trim()
                  ).length}
                </div>
                <div className="text-sm text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Clean Sections
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Summary */}
      {document.chunks && document.chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{document.chunks.length}</div>
                <div className="text-sm text-muted-foreground">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{document.totalWords?.toLocaleString() || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Total Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((document.totalWords || 0) / (document.chunks.length || 1))}
                </div>
                <div className="text-sm text-muted-foreground">Avg Words/Section</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results ? results.sections.reduce((sum, s) => sum + s.suggestions.length, 0) : '?'}
                </div>
                <div className="text-sm text-muted-foreground">Total Suggestions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Analyzing Document
              </>
            ) : results ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Analysis Complete
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-blue-500" />
                Ready to Analyze
              </>
            )}
          </CardTitle>
          {results && !analyzing && (
            <p className="text-sm text-muted-foreground mt-1">
              Previous analysis completed with <span className="font-medium">{previousLevel || 'moderate'}</span> level. 
              {changeLevel !== (previousLevel || 'moderate') 
                ? `Select "${changeLevel}" and rerun to see different results.`
                : 'Choose a different level to rerun analysis.'
              }
            </p>
          )}
                  </CardHeader>
          <CardContent className="space-y-4">
            {analyzing ? (
              <>
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">{currentSection}</p>
                </div>
                
                {/* Show processed sections in real-time */}
                {processedSections.length > 0 && (
                  <div className="space-y-2">
                    <hr className="border-t border-gray-200" />
                    <h4 className="font-medium">Completed Sections:</h4>
                    <div className="h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {processedSections.map((section, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                            <span className="font-medium">{section.title}</span>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {section.suggestions.length} total
                              </Badge>
                              {section.consistencyIssues?.length > 0 && (
                                <Badge variant="outline" className="text-xs text-blue-600">
                                  {section.consistencyIssues.length} consistency
                                </Badge>
                              )}
                              {section.missingInformation?.length > 0 && (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  {section.missingInformation.length} missing
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-6">
                {!results && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Your document will be analyzed using the full document as context for:</p>
                    <div className="flex justify-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-blue-500" />
                        Consistency checks
                      </span>
                      <span className="flex items-center gap-1">
                        <Info className="h-3 w-3 text-orange-500" />
                        Missing information
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-red-500" />
                        Proofreading
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Change Level Selector - Always visible */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">
                    {results ? 'Rerun with Different Level' : 'Analysis Level'}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setChangeLevel('minor')}
                      disabled={analyzing}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        changeLevel === 'minor'
                          ? 'bg-green-100 border-green-500 text-green-700 shadow-sm'
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
                      } ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">Minor</div>
                      <div className="text-xs opacity-75 mt-1">Proofreading & missing info</div>
                      <div className="text-xs opacity-60 mt-0.5">Wording, style, consistency</div>
                    </button>
                    <button
                      onClick={() => setChangeLevel('major')}
                      disabled={analyzing}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        changeLevel === 'major'
                          ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm'
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
                      } ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">Major</div>
                      <div className="text-xs opacity-75 mt-1">Significant rewriting</div>
                      <div className="text-xs opacity-60 mt-0.5">Better storytelling & structure</div>
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={startAnalysis} 
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {results ? 'Rerun' : 'Start'} {changeLevel.charAt(0).toUpperCase() + changeLevel.slice(1)} Analysis
                    </>
                  )}
                </Button>

                {results && (
                  <p className="text-xs text-muted-foreground">
                    This will replace the current analysis results
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Filter to only show sections with actual changes/problems */}
          {results.sections
            .filter(section => {
              // Must have suggestions
              if (!section.suggestions || section.suggestions.length === 0) return false
              
              // Must have actual text changes (not just identical text)
              const hasActualChanges = section.original?.trim() !== section.cleanVersion?.trim()
              if (!hasActualChanges) {
                console.log(`⏭️ Skipping section "${section.title}" - no actual changes despite ${section.suggestions.length} reported suggestions`)
                return false
              }
              
              return true
            })
            .map((section, index, filteredSections) => (
                <div key={section.title || index} className="space-y-6">
                  {/* Section Header */}
                  <div className="border-b pb-2">
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.wordCount} words • {section.suggestions.length} issues found</p>
                  </div>

                {/* Section Comparison - Show entire section at once */}
                <SectionComparison
                  original={section.original}
                  cleanVersion={section.cleanVersion}
                  suggestions={section.suggestions}
                  explanation={section.explanation}
                />

                {/* Divider between sections */}
                {index < filteredSections.length - 1 && (
                  <div className="flex items-center justify-center py-4">
                    <hr className="flex-1 border-t-2 border-gray-200" />
                    <span className="px-4 text-sm text-gray-400 bg-white">Next Problem Section</span>
                    <hr className="flex-1 border-t-2 border-gray-200" />
                  </div>
                )}
              </div>
                        ))}
          
          {/* Show message if no problems found */}
          {results.sections
            .filter(section => {
              if (!section.suggestions || section.suggestions.length === 0) return false
              return section.original?.trim() !== section.cleanVersion?.trim()
            }).length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-600 mb-2">Document looks great!</h3>
              <p className="text-gray-600">
                No actual changes needed at the <span className="font-medium">{previousLevel || 'minor'}</span> analysis level. 
                {(previousLevel || 'minor') === 'minor' && ' Proofreading and style review found no issues.'}
                {(previousLevel || 'minor') === 'major' && ' Comprehensive rewriting analysis found no improvements needed.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
