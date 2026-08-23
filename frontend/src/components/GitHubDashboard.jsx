import { useEffect, useState } from 'react'
import { fetchGitHubData } from '../services/api'

const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    Go: '#00ADD8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
}

function GitHubDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGitHubData()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="card">
                <div className="loading">
                    <div className="spinner"></div>
                    <span>Loading GitHub data...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="card">
                <div className="error">
                    Error loading GitHub: {error}
                </div>
            </div>
        )
    }

    if (!data) return null

    const { profile, stats, top_repos } = data

    const totalLangCount = Object.values(stats.languages).reduce((a, b) => a + b, 0)

    return (
        <div className="card fade-in">
            <h2 className="card-title">
                <span>🐙</span> GitHub Profile
            </h2>

            <div className="profile-info">
                <img src={profile.avatar_url} alt="GitHub Avatar" />
                <div>
                    <h3>{profile.name || profile.login}</h3>
                    <p>{profile.bio || 'No bio available'}</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {profile.location || 'Location not set'} •
                        {profile.company || 'Independent'}
                    </p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-value">{profile.public_repos}</div>
                    <div className="stat-label">Repositories</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{profile.followers}</div>
                    <div className="stat-label">Followers</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.total_stars}</div>
                    <div className="stat-label">Total Stars</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.total_forks}</div>
                    <div className="stat-label">Total Forks</div>
                </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Languages</h3>
            <div className="language-bar">
                {Object.entries(stats.languages).map(([lang, count]) => {
                    const percentage = (count / totalLangCount) * 100
                    return (
                        <div
                            key={lang}
                            style={{
                                width: `${percentage}%`,
                                background: LANGUAGE_COLORS[lang] || '#6366f1',
                                height: '100%',
                            }}
                            title={`${lang}: ${count} repos (${percentage.toFixed(1)}%)`}
                        />
                    )
                })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {Object.entries(stats.languages).map(([lang, count]) => (
                    <span key={lang} className="language-tag">
                        <span
                            className="language-dot"
                            style={{ background: LANGUAGE_COLORS[lang] || '#6366f1' }}
                        />
                        {lang} {count}
                    </span>
                ))}
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Top Repositories</h3>
            <ul className="repo-list">
                {top_repos.map((repo) => (
                    <li key={repo.id} className="repo-item">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                            {repo.name}
                        </a>
                        <span className="repo-stars">
                            ⭐ {repo.stargazers_count}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default GitHubDashboard