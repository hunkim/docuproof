import { type NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { getFirestore } from "firebase-admin/firestore"
import { verifyIdToken } from "@/lib/firebase-admin"

// Function to extract text using Upstage Document Parser
async function extractTextFromDocument(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('output_formats', '["html"]')  // Only HTML for structural information
    formData.append('coordinates', 'false')        // Turn off coordinates
    formData.append('model', 'document-parse')

    const response = await fetch('https://api.upstage.ai/v1/document-digitization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTAGE_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Upstage API error:', response.status, errorText)
      throw new Error(`Upstage API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Upstage response structure:', {
      hasContent: !!result.content,
      hasHtml: !!(result.content?.html),
      apiVersion: result.api,
      model: result.model
    })
    
    // Extract text from HTML structure - preserve document structure
    let extractedText = ''
    
    if (result.content?.html && typeof result.content.html === 'string') {
      // Convert HTML to structured plain text while preserving document hierarchy
      extractedText = result.content.html
        .replace(/<br\s*\/?>/gi, '\n')          // Convert <br> to newlines
        .replace(/<\/h[1-6]>/gi, '\n\n')        // Double newlines after headings
        .replace(/<\/p>/gi, '\n\n')             // Double newlines after paragraphs  
        .replace(/<\/div>/gi, '\n')             // Newlines after div blocks
        .replace(/<\/li>/gi, '\n')              // Newlines after list items
        .replace(/<[^>]*>/g, ' ')               // Remove all remaining HTML tags
        .replace(/\n\s*\n\s*\n/g, '\n\n')       // Normalize multiple newlines to double
        .replace(/[ \t]+/g, ' ')                // Normalize spaces and tabs
        .replace(/\n[ \t]+/g, '\n')             // Clean up line starts
        .replace(/[ \t]+\n/g, '\n')             // Clean up line ends
        .trim()
    }

    if (!extractedText || extractedText.length < 10) {
      console.error('No valid text extracted from HTML content')
      throw new Error('No readable text content found in document. The document may be an image, empty, or in an unsupported format.')
    }

    console.log('✅ Text extracted successfully!')
    console.log('   Length:', extractedText.length, 'characters')
    console.log('   Preview:', extractedText.substring(0, 150) + '...')

    return extractedText
  } catch (error) {
    console.error('Error extracting text:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to extract text from document')
  }
}

// Function to chunk text into semantically coherent sections of ~700 words
function chunkText(text: string): Array<{ title: string; content: string; wordCount: number }> {
  const chunks: Array<{ title: string; content: string; wordCount: number }> = []
  
  // Validate input
  if (!text || typeof text !== 'string') {
    console.error('Invalid text input for chunking:', typeof text, text)
    return [{
      title: 'Document Content',
      content: 'Error: No text content available',
      wordCount: 0
    }]
  }

  const cleanText = text.trim()
  if (!cleanText) {
    return [{
      title: 'Document Content', 
      content: 'Error: Empty document',
      wordCount: 0
    }]
  }
  
  // Smart paragraph splitting that preserves semantic structure
  const lines = cleanText.split('\n')
  const semanticSections = []
  let currentSection = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
    
    // Always add current line to section
    currentSection.push(lines[i])
    
    // Check if this is a natural break point
    const isBreakPoint = (
      // Empty line followed by header-like content
      (line === '' && isHeaderLike(nextLine)) ||
      // Current line is a header and next line is content
      (isHeaderLike(line) && nextLine !== '' && !isHeaderLike(nextLine)) ||
      // End of a numbered/bulleted section
      (line.match(/\.\s*$/) && nextLine.match(/^[\d\w][\.\)]\s/)) ||
      // Major section transitions
      (line === '' && nextLine.match(/^(Abstract|Introduction|Conclusion|References|Appendix|Chapter|Part)/i)) ||
      // Double line break (paragraph boundary)
      (line === '' && nextLine === '' && i + 2 < lines.length)
    )
    
    if (isBreakPoint || i === lines.length - 1) {
      if (currentSection.some(l => l.trim())) {
        semanticSections.push(currentSection.join('\n'))
      }
      currentSection = []
    }
  }
  
  // Chunk the semantic sections into ~700 word chunks
  let currentChunk = ''
  let chunkIndex = 1
  let currentTitle = ''
  
  for (const section of semanticSections) {
    const sectionText = section.trim()
    if (!sectionText) continue
    
    const sectionWords = countWords(sectionText)
    const currentWords = countWords(currentChunk)
    
    // Extract title from section
    const sectionTitle = extractSectionTitle(sectionText)
    
    // Decide whether to start a new chunk
    const shouldStartNewChunk = (
      currentWords > 0 && (
        currentWords + sectionWords > 700 || // Target ~700 words
        (currentWords > 400 && isHeaderLike(sectionText.split('\n')[0])) // Don't mix major headers
      )
    )
    
    if (shouldStartNewChunk) {
      chunks.push({
        title: currentTitle || `Section ${chunkIndex}`,
        content: currentChunk.trim(),
        wordCount: currentWords
      })
      
      currentChunk = sectionText
      currentTitle = sectionTitle
      chunkIndex++
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + sectionText
      if (!currentTitle && sectionTitle) {
        currentTitle = sectionTitle
      }
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    const finalWords = countWords(currentChunk)
    chunks.push({
      title: currentTitle || `Section ${chunkIndex}`,
      content: currentChunk.trim(),
      wordCount: finalWords
    })
  }
  
  // If no chunks were created, create one with the entire text
  if (chunks.length === 0 && cleanText) {
    const title = extractSectionTitle(cleanText) || 'Document Content'
    chunks.push({
      title: title,
      content: cleanText,
      wordCount: countWords(cleanText)
    })
  }
  
  return chunks
}

// Helper function to count words in text
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Helper function to detect header-like lines
function isHeaderLike(line: string): boolean {
  if (!line || !line.trim()) return false
  
  const trimmed = line.trim()
  
  // Common header patterns
  return (
    // Numbered headers (1. Title, 1.1 Title, etc.)
    /^\d+(\.\d+)*[\.\)]\s+/.test(trimmed) ||
    // Roman numerals (I. Title, II. Title, etc.)
    /^[IVX]+[\.\)]\s+/.test(trimmed) ||
    // Lettered headers (A. Title, B. Title, etc.)
    /^[A-Z][\.\)]\s+/.test(trimmed) ||
    // All caps headers (TITLE, SECTION TITLE)
    (/^[A-Z\s\d\.\-:]{3,}$/.test(trimmed) && trimmed.length < 100) ||
    // Title case headers ending with colon
    /^[A-Z][a-z\s\d\.\-]*:$/.test(trimmed) ||
    // Markdown-style headers (# Title, ## Title)
    /^#{1,6}\s+/.test(trimmed) ||
    // Underlined headers (line followed by ===== or -----)
    /^[=\-]{3,}$/.test(trimmed) ||
    // Common document sections
    /^(Abstract|Introduction|Background|Methodology|Methods|Results|Discussion|Conclusion|References|Appendix|Summary|Overview|Chapter|Part|Section|Table of Contents)$/i.test(trimmed)
  )
}

// Helper function to extract a meaningful title from a section
function extractSectionTitle(sectionText: string): string {
  if (!sectionText) return ''
  
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length === 0) return ''
  
  // Try to find the best title from the first few lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i]
    
    // Skip very short lines or lines that are just punctuation
    if (line.length < 3 || /^[\s\.\-=]+$/.test(line)) continue
    
    // If this looks like a header, use it
    if (isHeaderLike(line)) {
      // Clean up the header text
      let title = line
        .replace(/^\d+(\.\d+)*[\.\)]\s*/, '') // Remove numbering
        .replace(/^[IVX]+[\.\)]\s*/, '') // Remove roman numerals
        .replace(/^[A-Z][\.\)]\s*/, '') // Remove letter numbering
        .replace(/^#{1,6}\s*/, '') // Remove markdown headers
        .replace(/:$/, '') // Remove trailing colon
        .trim()
      
      // If title is reasonable length, use it
      if (title.length > 2 && title.length < 100) {
        return title
      }
    }
    
    // If not a header but looks like a title (reasonable length, not too long)
    if (line.length > 5 && line.length < 100 && (!line.includes('.') || line.split('.').length < 3)) {
      // Avoid lines that look like body text (contain common words in middle)
      const commonWords = ['the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cannot', 'this', 'that', 'these', 'those', 'which', 'what', 'who', 'where', 'when', 'why', 'how']
      const words = line.toLowerCase().split(/\s+/)
      const commonWordCount = words.filter(word => commonWords.includes(word)).length
      
      // If not too many common words, might be a title
      if (commonWordCount / words.length < 0.4) {
        return line.trim()
      }
    }
  }
  
  // Fallback: use first non-empty line, truncated if too long
  const firstLine = lines[0]
  if (firstLine && firstLine.length > 0) {
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine
  }
  
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    const documentId = nanoid()

    // Extract text from document using Upstage Document Parser
    let extractedText = ''
    let chunks: Array<{ title: string; content: string; wordCount: number }> = []
    
    try {
      extractedText = await extractTextFromDocument(file)
      chunks = chunkText(extractedText)
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No content chunks created from document')
      }

      // Validate that we have actual content
      const hasValidContent = chunks.some(chunk => 
        chunk.content && chunk.content.length > 10 && !chunk.content.startsWith('Error:')
      )
      
      if (!hasValidContent) {
        throw new Error('No valid text content found in document')
      }

    } catch (error) {
      console.error('Text extraction failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from document'
      return NextResponse.json({ 
        error: errorMessage,
        details: "Please ensure your document contains readable text and is not password-protected or corrupted."
      }, { status: 500 })
    }

    // Calculate total words safely
    const totalWords = extractedText && typeof extractedText === 'string' 
      ? extractedText.split(/\s+/).filter(word => word.length > 0).length 
      : 0

    // Create document record in Firestore (no file storage - only text)
    const documentData = {
      id: documentId,
      userId: decodedToken.uid,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: "text_extracted",
      isPublic: false,
      extractedText,
      chunks,
      totalWords,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const db = getFirestore()
    await db.collection("documents").doc(documentId).set(documentData)

    return NextResponse.json({ document: documentData })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
