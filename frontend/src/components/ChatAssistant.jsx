import { useState, useRef, useCallback } from 'react'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { streamChatMessage } from '../services/api'

function cleanText(text) {
    if (!text) return ''
    return text
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
        .replace(/\*+/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function ChatAssistant() {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm Anuj's AI assistant. I can answer questions about his resume, skills, projects, and experience. What would you like to know?",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef(null)
    const abortControllerRef = useRef(null)

    const { containerRef, bottomRef } = useAutoScroll(messages)

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        }

        // Add user message immediately
        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        // Create placeholder for assistant response
        const assistantId = (Date.now() + 1).toString()
        setMessages((prev) => [
            ...prev,
            {
                id: assistantId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
            },
        ])

        try {
            let fullResponse = ''

            // Stream tokens from backend
            for await (const token of streamChatMessage(userMessage.content)) {
                fullResponse += token
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: fullResponse }
                            : msg
                    )
                )
            }

            // Mark streaming as done
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? { ...msg, isStreaming: false }
                        : msg
                )
            )
        } catch (error) {
            console.error('Chat error:', error)
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                            ...msg,
                            content: 'Sorry, I encountered an error. Please try again.',
                            isError: true,
                            isStreaming: false,
                        }
                        : msg
                )
            )
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }, [input, isLoading])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-status"></div>
                <div>
                    <div style={{ fontWeight: 700 }}>AI Assistant</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isLoading ? 'Typing...' : 'Online'}
                    </div>
                </div>
            </div>

            <div className="chat-messages" ref={containerRef}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}
                    >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        <div className="message-time">
                            {formatTime(msg.timestamp)}
                            {msg.isStreaming && <span style={{ marginLeft: '0.5rem' }}>●</span>}
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            <div className="chat-input-container">
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Ask about Anuj's experience, skills, or projects..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                >
                    {isLoading ? '⏳' : '➤'}
                </button>
            </div>
        </div>
    )
}

export default ChatAssistant