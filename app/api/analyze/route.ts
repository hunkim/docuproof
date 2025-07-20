import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { verifyIdToken } from "@/lib/firebase-admin"

// Function to analyze text chunk using Solar LLM with full document context
async function analyzeSectionWithSolar(
  sectionContent: string, 
  sectionTitle: string,
  fullDocumentText: string,
  sectionIndex: number,
  totalSections: number,
  changeLevel: 'minor' | 'medium' | 'major' = 'medium'
): Promise<any> {
  try {
    const response = await fetch('https://api.upstage.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
              body: JSON.stringify({
          model: "solar-pro2",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a professional document editor. Analyze the given text section and respond with valid JSON only.

ANALYSIS LEVEL: ${changeLevel.toUpperCase()}

${changeLevel === 'minor' ? `
MINOR LEVEL REQUIREMENTS:
- PROOFREADING: Fix grammar errors, spelling mistakes, punctuation issues
- MISSING INFORMATION: Identify gaps, unclear references, incomplete sentences
- WORDING & STYLE: Improve word choices, terminology consistency, basic flow
- Scope: Minimal corrections, maintain original structure and voice
- Goal: Clean, error-free text with basic polish
` : changeLevel === 'medium' ? `
MEDIUM LEVEL REQUIREMENTS:
- COMPREHENSIVE EDITING: Fix all errors PLUS improve clarity and engagement
- STYLE ENHANCEMENT: Enhance tone, flow, readability, and professional quality
- CONTENT IMPROVEMENT: Strengthen arguments, add transitions, improve organization
- REWRITING: Moderate restructuring of sentences and paragraphs for better impact
- Goal: Significantly improved text that's more engaging and effective
` : `
MAJOR LEVEL REQUIREMENTS:
- AGGRESSIVE REWRITING: Completely reimagine and restructure the content
- STORYTELLING MASTERY: Transform into compelling, engaging, powerful narrative
- COMPREHENSIVE TRANSFORMATION: Reorganize, enhance, and elevate every aspect
- PROFESSIONAL EXCELLENCE: Make this text as impactful and effective as possible
- LENGTH FLEXIBILITY: Expand or condense as needed for maximum impact
- BOLD IMPROVEMENTS: Don't hold back - this should be dramatically better
- Goal: World-class writing that significantly outperforms the original
`}

ANALYSIS CATEGORIES:
1. **Consistency**: Find terminology inconsistencies, tone variations, style changes, formatting issues
2. **Missing Information**: Find incomplete sentences, unclear references, missing context, gaps
3. **Proofreading**: Find grammar errors, spelling mistakes, punctuation issues, better word choices

TEXT MODIFICATION POLICY:
${changeLevel === 'minor' ? `
- CONSERVATIVE: Only remove text if clearly duplicated or factually incorrect
- PRESERVE: Keep all meaningful information and maintain similar length
- MINIMAL: Make the fewest changes necessary for correctness
` : changeLevel === 'medium' ? `
- MODERATE: Remove redundant text and improve structure as needed
- FLEXIBLE: Adjust length moderately to improve clarity and flow  
- BALANCED: Meaningful improvements while respecting original content
` : `
- AGGRESSIVE: Remove, restructure, and rewrite extensively for maximum impact
- TRANSFORMATIVE: Significantly expand or condense as needed for effectiveness
- BOLD: Prioritize quality over preservation - make dramatic improvements
`}

CRITICAL INSTRUCTIONS:
- You MUST respond with ONLY valid JSON - no markdown, no explanations, no other text
- Do not use markdown headers like ### or ** 
- Do not include any text before or after the JSON
- Apply the analysis level consistently - ${changeLevel === 'minor' ? 'be conservative and minimal' : changeLevel === 'medium' ? 'be balanced but impactful' : 'be aggressive and transformative'}
- For MAJOR level: This should be dramatically better writing - don't hold back!

JSON SCHEMA (respond with this exact structure):
{
  "consistencyIssues": [
    {
      "type": "terminology|tone|style|formatting", 
      "issue": "brief description",
      "original": "original text",
      "suggested": "corrected text",
      "explanation": "why this fix"
    }
  ],
  "missingInformation": [
    {
      "location": "where in text",
      "gap": "what's missing",
      "suggestion": "what to add",
      "reasoning": "why needed"
    }
  ],
  "proofreadingFixes": [
    {
      "type": "grammar|spelling|punctuation|syntax|word_choice",
      "original": "incorrect text",
      "suggested": "corrected text", 
      "explanation": "why better"
    }
  ],
  "cleanVersion": "corrected text with all fixes applied",
  "summary": "brief summary of changes made"
}`
            },
          {
            role: "user",
            content: `Please check consistency of this chunk/chapter:

<chapter_to_work_on>
${sectionContent}
</chapter_to_work_on>

Based on the entire context:

<entire_context>
${fullDocumentText}
</entire_context>

Analyze this section for consistency with the context, missing information, and proofreading needs according to the ${changeLevel} level requirements.

Output should be JSON only including the modified/suggested version of the chapter to work on.`
          }
        ],
        reasoning_effort: "high",
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Solar API error: ${response.status}`, errorText)
      throw new Error(`Solar API error: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.choices[0]?.message?.content || '{}'
    
    console.log(`🔍 Solar LLM Analysis for "${sectionTitle}":`)
    console.log(`📝 Response length: ${analysisText.length} characters`)
    console.log(`📄 Raw response:`, analysisText.substring(0, 500) + '...')
    
    try {
      let parsedResult
      
      // Try parsing the response as-is first
      try {
        parsedResult = JSON.parse(analysisText)
      } catch (firstError) {
        // If that fails, try to extract JSON from text that might have extra content
        console.log('⚠️ Direct JSON parse failed, attempting to extract JSON from response')
        
        // Look for JSON content between curly braces
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0])
            console.log('✅ Successfully extracted JSON from response')
          } catch (extractError) {
            throw new Error(`Could not parse extracted JSON: ${extractError}`)
          }
        } else {
          throw new Error(`No JSON found in response: ${analysisText.substring(0, 200)}...`)
        }
      }
      
      console.log(`✅ Successfully parsed JSON response`)
      console.log(`🔧 Found issues:`)
      console.log(`   • Consistency: ${parsedResult.consistencyIssues?.length || 0}`)
      console.log(`   • Missing info: ${parsedResult.missingInformation?.length || 0}`)
      console.log(`   • Proofreading: ${parsedResult.proofreadingFixes?.length || 0}`)
      
      // Combine all issues into suggestions array for compatibility
      const allSuggestions = [
        ...parsedResult.consistencyIssues?.map((issue: any) => ({
          type: 'consistency',
          issue: issue.issue,
          original: issue.original,
          suggested: issue.suggested,
          explanation: issue.explanation
        })) || [],
        ...parsedResult.missingInformation?.map((info: any) => ({
          type: 'missing_info',
          issue: `Missing information: ${info.gap}`,
          original: info.location,
          suggested: info.suggestion,
          explanation: info.reasoning
        })) || [],
        ...parsedResult.proofreadingFixes?.map((fix: any) => ({
          type: fix.type,
          issue: `${fix.type} error`,
          original: fix.original,
          suggested: fix.suggested,
          explanation: fix.explanation
        })) || []
      ]

      console.log(`📊 Total suggestions created: ${allSuggestions.length}`)
      console.log(`📝 Clean version length: ${(parsedResult.cleanVersion || sectionContent).length}`)

      return {
        suggestions: allSuggestions,
        cleanVersion: parsedResult.cleanVersion || sectionContent,
        explanation: parsedResult.summary || "Analysis completed successfully.",
        consistencyIssues: parsedResult.consistencyIssues || [],
        missingInformation: parsedResult.missingInformation || [],
        proofreadingFixes: parsedResult.proofreadingFixes || []
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails completely
      console.error(`❌ Failed to parse JSON response:`, parseError)
      console.log(`📄 Raw response that failed to parse:`, analysisText.substring(0, 500))
      
      // Return fallback result with at least some basic analysis attempt
      return {
        suggestions: [{
          type: 'system_error',
          issue: 'Analysis parsing failed',
          original: sectionContent.substring(0, 100) + '...',
          suggested: sectionContent,
          explanation: 'Could not parse analysis results, but text appears readable as-is.'
        }],
        cleanVersion: sectionContent,
        explanation: "Analysis completed but result formatting could not be parsed. Text appears acceptable as-is.",
        consistencyIssues: [],
        missingInformation: [],
        proofreadingFixes: []
      }
    }
  } catch (error) {
    console.error('Solar LLM analysis error:', error)
    throw new Error('Failed to analyze text with Solar LLM')
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return new Response("Invalid token", { status: 401 })
    }

    const { documentId, changeLevel = 'medium' } = await request.json()

    const db = getFirestore()
    
    // Update document status
    await db.collection("documents").doc(documentId).update({
      status: "analyzing",
      updatedAt: new Date(),
    })

    // Get document data to access chunks and full text
    const docRef = db.collection("documents").doc(documentId)
    const docSnap = await docRef.get()
    
    if (!docSnap.exists) {
      return new Response("Document not found", { status: 404 })
    }

    const docData = docSnap.data()
    if (!docData) {
      return new Response("Document data not found", { status: 404 })
    }
    
    const chunks = docData.chunks || []
    const fullDocumentText = docData.extractedText || ""

    if (chunks.length === 0) {
      return new Response("No text chunks found in document", { status: 400 })
    }

    console.log(`🚀 Starting ${changeLevel} analysis of ${chunks.length} chunks`)
    console.log(`📄 Full document text length: ${fullDocumentText.length} characters`)
    console.log(`📝 Document preview: ${fullDocumentText.substring(0, 200)}...`)

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const analysisResults = []
          
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'start',
            totalSections: chunks.length,
            message: `Starting ${changeLevel} analysis of ${chunks.length} sections...`,
            changeLevel: changeLevel
          })}\n\n`))
          
          // Process each chunk with full document context
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            
            console.log(`🔍 Analyzing section ${i + 1}/${chunks.length}: "${chunk.title}"`)
            
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress',
              currentSection: i + 1,
              totalSections: chunks.length,
              sectionTitle: chunk.title,
              message: `${changeLevel.charAt(0).toUpperCase() + changeLevel.slice(1)} analysis: ${chunk.title}`
            })}\n\n`))
            
            try {
              const analysis = await analyzeSectionWithSolar(
                chunk.content, 
                chunk.title, 
                fullDocumentText, 
                i, 
                chunks.length,
                changeLevel
              )
              
              const sectionResult = {
                title: chunk.title,
                original: chunk.content,
                wordCount: chunk.wordCount,
                suggestions: analysis.suggestions || [],
                cleanVersion: analysis.cleanVersion || chunk.content,
                explanation: analysis.explanation || "No specific issues found.",
                consistencyIssues: analysis.consistencyIssues || [],
                missingInformation: analysis.missingInformation || [],
                proofreadingFixes: analysis.proofreadingFixes || []
              }

              analysisResults.push(sectionResult)
              console.log(`✅ Section "${chunk.title}" completed - ${analysis.suggestions?.length || 0} suggestions found`)

              // Send section result immediately
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'section',
                section: sectionResult,
                progress: Math.round(((i + 1) / chunks.length) * 100)
              })}\n\n`))

            } catch (error) {
              console.error(`❌ Error analyzing chunk ${i + 1}:`, error)
              
              // Add fallback result for failed chunk
              const fallbackResult = {
                title: chunk.title,
                original: chunk.content,
                wordCount: chunk.wordCount,
                suggestions: [],
                cleanVersion: chunk.content,
                explanation: "Analysis failed for this section.",
                consistencyIssues: [],
                missingInformation: [],
                proofreadingFixes: []
              }

              analysisResults.push(fallbackResult)
              
              // Send error section result
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'section',
                section: fallbackResult,
                progress: Math.round(((i + 1) / chunks.length) * 100)
              })}\n\n`))
            }
          }

          // Calculate overall summary
          const totalSuggestions = analysisResults.reduce((sum, section) => sum + section.suggestions.length, 0)
          const consistencyIssues = analysisResults.flatMap(s => s.consistencyIssues || [])
          const missingInfoIssues = analysisResults.flatMap(s => s.missingInformation || [])
          const proofreadingIssues = analysisResults.flatMap(s => s.proofreadingFixes || [])

          const overallSummary = `Analysis completed with full document context. Found ${totalSuggestions} total suggestions: ${consistencyIssues.length} consistency issues, ${missingInfoIssues.length} missing information gaps, and ${proofreadingIssues.length} proofreading corrections across ${analysisResults.length} sections.`

          // Gather top consistency issues for summary
          const topConsistencyIssues = consistencyIssues
            .map(issue => issue.issue)
            .slice(0, 5) // Limit to top 5

          const finalResult = {
            sections: analysisResults,
            overallSummary,
            consistencyIssues: topConsistencyIssues,
            totalWords: docData.totalWords || 0,
            completedAt: new Date().toISOString(),
            analysisType: "context-aware-analysis"
          }

          console.log(`🎉 Analysis completed! Total sections: ${analysisResults.length}, Total suggestions: ${totalSuggestions}`)

          // Save results to Firestore
          await db.collection("documents").doc(documentId).update({
            status: "completed",
            analysisResults: finalResult,
            updatedAt: new Date(),
          })

          // Send final completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete',
            finalResult,
            totalSuggestions,
            message: `Analysis complete! Found ${totalSuggestions} total suggestions.`
          })}\n\n`))

          controller.close()
        } catch (error) {
          console.error("❌ Stream error:", error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            message: error instanceof Error ? error.message : 'Analysis failed'
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("❌ Analysis error:", error)
    return new Response("Internal server error", { status: 500 })
  }
}
