import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../utils/ai'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => (
  <div
    className={`py-6 streaming-message ${
      message.role === 'assistant'
        ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5'
        : 'bg-transparent'
    }`}
  >
    <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
      {message.role === 'assistant' ? (
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 ml-4 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
          AI
        </div>
      ) : (
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-medium text-white bg-gray-700 rounded-lg">
          Y
        </div>
      )}
      <div className={`flex-1 min-w-0 mr-4 ${isStreaming ? 'streaming-cursor' : ''}`}>
        <ReactMarkdown
          className="prose dark:prose-invert max-w-none"
          rehypePlugins={[
            rehypeRaw,
            rehypeSanitize,
            rehypeHighlight,
          ]}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  </div>
); 