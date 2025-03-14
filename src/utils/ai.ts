import { createServerFn } from '@tanstack/react-start'
import { Anthropic } from '@anthropic-ai/sdk'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_SYSTEM_PROMPT = `You are TanStack Chat, an AI assistant using Markdown for clear and structured responses. Format your responses following these guidelines:

1. Use headers for sections:
   # For main topics
   ## For subtopics
   ### For subsections

2. For lists and steps:
   - Use bullet points for unordered lists
   - Number steps when sequence matters
   
3. For code:
   - Use inline \`code\` for short snippets
   - Use triple backticks with language for blocks:
   \`\`\`python
   def example():
       return "like this"
   \`\`\`

4. For emphasis:
   - Use **bold** for important points
   - Use *italics* for emphasis
   - Use > for important quotes or callouts

5. For structured data:
   | Use | Tables |
   |-----|---------|
   | When | Needed |

6. Break up long responses with:
   - Clear section headers
   - Appropriate spacing between sections
   - Bullet points for better readability
   - Short, focused paragraphs

7. For technical content:
   - Always specify language for code blocks
   - Use inline \`code\` for technical terms
   - Include example usage where helpful

Keep responses concise and well-structured. Use appropriate Markdown formatting to enhance readability and understanding.`

// Non-streaming implementation
export const genAIResponse = createServerFn({ method: 'GET', response: 'raw' })
  .validator(
    (d: {
      messages: Array<Message>
      systemPrompt?: { value: string; enabled: boolean }
    }) => d,
  )
  // .middleware([loggingMiddleware])
  .handler(async ({ data }) => {
    // Check for API key in environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error(
        'Missing API key: Please set VITE_ANTHROPIC_API_KEY in your environment variables or VITE_ANTHROPIC_API_KEY in your .env file.'
      )
    }
    
    // Create Anthropic client with proper configuration
    const anthropic = new Anthropic({
      apiKey,
      // Add proper timeout to avoid connection issues
      timeout: 30000 // 30 seconds timeout
    })

    // Filter out error messages and empty messages
    const formattedMessages = data.messages
      .filter(
        (msg) =>
          msg.content.trim() !== '' &&
          !msg.content.startsWith('Sorry, I encountered an error'),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }))

    if (formattedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages to send' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = data.systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${data.systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT

    // Debug log to verify prompt layering
    console.log('System Prompt Configuration:', {
      hasCustomPrompt: data.systemPrompt?.enabled,
      customPromptValue: data.systemPrompt?.value,
      finalPrompt: systemPrompt,
    })

    try {
      const response = await anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: formattedMessages,
      })

      return new Response(response.toReadableStream())
    } catch (error) {
      console.error('Error in genAIResponse:', error)
      
      // Error handling with specific messages
      let errorMessage = 'Failed to get AI response'
      let statusCode = 500
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.'
        } else if (error.message.includes('Connection error') || error.name === 'APIConnectionError') {
          errorMessage = 'Connection to Anthropic API failed. Please check your internet connection and API key.'
          statusCode = 503 // Service Unavailable
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication failed. Please check your Anthropic API key.'
          statusCode = 401 // Unauthorized
        } else {
          errorMessage = error.message
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.name : undefined
      }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }) 