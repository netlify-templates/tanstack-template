import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import {
  PlusCircle,
  MessageCircle,
  Trash2,
  Send,
  Settings,
  Edit2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'

import { SettingsDialog } from '../components/demo.SettingsDialog'
import { useConversations } from '../store/demo.hooks'
import { store, actions } from '../store/demo.store'
import { genAIResponse } from '../utils/demo.ai'
import { useAppState } from '../store/demo.hooks'

import type { Message } from '../utils/demo.ai'

function Home() {
  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
  } = useConversations()
  
  const { isLoading, setLoading, getActivePrompt } = useAppState()

  const messages = currentConversation?.messages || []

  // Local state
  const [input, setInput] = useState('')
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const currentInput = input
    setInput('') // Clear input early for better UX
    setLoading(true)
    setError(null)

    try {
      let conversationId = currentConversationId

      // If no current conversation, create one
      if (!conversationId) {
        try {
          // Create a temporary local conversation for immediate feedback
          const tempId = Date.now().toString()
          const tempConversation = {
            id: tempId,
            title: currentInput.trim().slice(0, 30),
            messages: [],
          }
          
          // Add to local state first
          actions.addConversation(tempConversation)
          conversationId = tempId
          
          // User message to be added
          const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: currentInput.trim(),
          }
          
          // Add user message to local state
          actions.addMessage(conversationId, userMessage)
          
          // Process the message with AI
          await processAIResponse(conversationId, userMessage)
          
          // After everything is done, create the conversation in Convex
          // This will happen in the background and sync later
          createNewConversation().then(async () => {
            if (currentConversationId && currentConversationId !== tempId) {
              // If we have a new Convex ID, update the title
              await updateConversationTitle(
                currentConversationId, 
                currentInput.trim().slice(0, 30)
              )
            }
          }).catch(e => {
            console.error("Background Convex sync failed:", e)
          })
        } catch (error) {
          console.error("Error in conversation creation:", error)
          throw new Error('Failed to create conversation')
        }
      } else {
        // We already have a conversation ID, proceed normally
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: currentInput.trim(),
        }
        
        // Add user message
        await addMessage(conversationId, userMessage)
        
        // Process with AI
        await processAIResponse(conversationId, userMessage)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your request.',
      }
      if (currentConversationId) {
        await addMessage(currentConversationId, errorMessage)
      }
      else {
        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError('An unknown error occurred.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to process AI response
  const processAIResponse = async (conversationId: string, userMessage: Message) => {
    // Get active prompt
    const activePrompt = getActivePrompt(store.state)
    let systemPrompt
    if (activePrompt) {
      systemPrompt = {
        value: activePrompt.content,
        enabled: true,
      }
    }

    // Get AI response
    const response = await genAIResponse({
      data: {
        messages: [...messages, userMessage],
        systemPrompt,
      },
    })

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No reader found in response')
    }

    const decoder = new TextDecoder()

    let done = false
    let newMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: '',
    }
    while (!done) {
      const out = await reader.read()
      done = out.done
      if (!done) {
        try {
          const json = JSON.parse(decoder.decode(out.value))
          if (json.type === 'content_block_delta') {
            newMessage = {
              ...newMessage,
              content: newMessage.content + json.delta.text,
            }
            setPendingMessage(newMessage)
          }
        } catch (e) {}
      }
    }

    setPendingMessage(null)
    if (newMessage.content.trim()) {
      // Add AI message
      await addMessage(conversationId, newMessage)
    }
  }

  const handleNewChat = () => {
    createNewConversation()
  }

  const handleDeleteChat = async (id: string) => {
    await deleteConversation(id)
  }

  const handleUpdateChatTitle = async (id: string, title: string) => {
    await updateConversationTitle(id, title)
    setEditingChatId(null)
    setEditingTitle('')
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  return (
    <div className="relative flex h-screen bg-gray-900">
      {/* Settings Button */}
      <div className="absolute z-50 top-5 right-5">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <PlusCircle className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
                chat.id === currentConversationId ? 'bg-gray-700/50' : ''
              }`}
              onClick={() => setCurrentConversationId(chat.id)}
            >
              <MessageCircle className="w-4 h-4 text-gray-400" />
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (editingTitle.trim()) {
                      handleUpdateChatTitle(chat.id, editingTitle)
                    }
                    setEditingChatId(null)
                    setEditingTitle('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingTitle.trim()) {
                      handleUpdateChatTitle(chat.id, editingTitle)
                    } else if (e.key === 'Escape') {
                      setEditingChatId(null)
                      setEditingTitle('')
                    }
                  }}
                  className="flex-1 text-sm text-white bg-transparent focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {chat.title}
                </span>
              )}
              <div className="items-center hidden gap-1 group-hover:flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingChatId(chat.id)
                    setEditingTitle(chat.title)
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteChat(chat.id)
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {error && (
          <p className="w-full max-w-3xl p-4 mx-auto font-bold text-orange-500">{error}</p>
        )}
        {currentConversationId ? (
          <>
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 pb-24 overflow-y-auto"
            >
              <div className="w-full max-w-3xl px-4 mx-auto">
                {[...messages, pendingMessage]
                  .filter((v) => v)
                  .map((message) => (
                    <div
                      key={message!.id}
                      className={`py-6 ${
                        message!.role === 'assistant'
                          ? 'bg-gradient-to-r from-orange-500/5 to-red-600/5'
                          : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
                        {message!.role === 'assistant' ? (
                          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 ml-4 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
                            AI
                          </div>
                        ) : (
                          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-medium text-white bg-gray-700 rounded-lg">
                            Y
                          </div>
                        )}
                        <div className="flex-1 min-w-0 mr-4">
                          <ReactMarkdown
                            className="prose dark:prose-invert max-w-none"
                            rehypePlugins={[
                              rehypeRaw,
                              rehypeSanitize,
                              rehypeHighlight,
                            ]}
                          >
                            {message!.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                {isLoading && (
                  <div className="px-6 py-6 bg-gradient-to-r from-orange-500/5 to-red-600/5">
                    <div className="flex items-start w-full max-w-3xl gap-4 mx-auto">
                      <div className="relative flex-shrink-0 w-8 h-8">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-[spin_2s_linear_infinite]"></div>
                        <div className="absolute inset-[2px] rounded-lg bg-gray-900 flex items-center justify-center">
                          <div className="relative flex items-center justify-center w-full h-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600">
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 animate-pulse"></div>
                            <span className="relative z-10 text-sm font-medium text-white">
                              AI
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-medium text-gray-400">
                          Thinking
                        </div>
                        <div className="flex gap-2">
                          <div
                            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
                            style={{ animationDelay: '0ms' }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
                            style={{ animationDelay: '200ms' }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-orange-500 animate-[bounce_0.8s_infinite]"
                            style={{ animationDelay: '400ms' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="absolute bottom-0 right-0 border-t left-64 bg-gray-900/80 backdrop-blur-sm border-orange-500/10">
              <div className="w-full max-w-3xl px-4 py-3 mx-auto">
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                      placeholder="Type something clever (or don't, we won't judge)..."
                      className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg shadow-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '200px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height =
                          Math.min(target.scrollHeight, 200) + 'px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 px-4">
            <div className="w-full max-w-3xl mx-auto text-center">
              <h1 className="mb-4 text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
                <span className="text-white">TanStack</span> Chat
              </h1>
              <p className="w-2/3 mx-auto mb-6 text-lg text-gray-400">
                You can ask me about anything, I might or might not have a good
                answer, but you can still ask.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="relative max-w-xl mx-auto">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder="Type something clever (or don't, we won't judge)..."
                    className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
                    rows={1}
                    style={{ minHeight: '88px' }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})