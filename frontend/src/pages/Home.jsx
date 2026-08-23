import { Link } from 'react-router-dom'
import { downloadResume } from '../services/api'

function Home() {
    return (
        <div className="page-container">
            <div className="hero">
                <div className="hero-content fade-in">
                    <div className="hero-badge">
                        Welcome to my portfolio
                    </div>
                    <h1>
                        Hi, I'm <span>Anuj Shandilya</span>
                    </h1>
                    <p>
                        Software Developer passionate about building scalable applications
                        and solving complex problems. Explore my GitHub activity, LeetCode
                        progress, and chat with my AI assistant.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn" onClick={downloadResume}>
                            Download Resume
                        </button>
                        <Link to="/dashboard" className="btn btn-secondary">
                            View Dashboards
                        </Link>
                        <Link to="/chat" className="btn btn-secondary">
                            AI Chat
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home