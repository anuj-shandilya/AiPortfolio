import GitHubDashboard from '../components/GitHubDashboard'
import LeetCodeDashboard from '../components/LeetCodeDashboard'

function Dashboard() {
    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header fade-in">
                    <h1>Developer Dashboards</h1>
                    <p>Real-time insights into my coding activity and problem-solving journey.</p>
                </div>
                <div className="dashboard-grid">
                    <GitHubDashboard />
                    <LeetCodeDashboard />
                </div>
            </div>
        </div>
    )
}

export default Dashboard