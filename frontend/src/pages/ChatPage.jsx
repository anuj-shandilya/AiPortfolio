import ChatAssistant from '../components/ChatAssistant'

function ChatPage() {
    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header fade-in">
                    <h1>AI Chat Assistant</h1>
                    <p>Ask questions about Anuj's resume, skills, and experience.</p>
                </div>
                <ChatAssistant />
            </div>
        </div>
    )
}

export default ChatPage