import { useEffect, useState } from 'react'
import { fetchLeetCodeData } from '../services/api'

const DIFFICULTY_CONFIG = {
    Easy: { color: '#22c55e', total: 850 },
    Medium: { color: '#f59e0b', total: 1800 },
    Hard: { color: '#ef4444', total: 800 },
}

function CircularProgress({ value, max, color, size = 100, strokeWidth = 8, label }) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const progress = max > 0 ? (value / max) * 100 : 0
    const dashoffset = circumference - (progress / 100) * circumference

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--bg-hover)"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: color,
                }}>
                    {value}
                </div>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {label}
            </div>
        </div>
    )
}

function LeetCodeDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchLeetCodeData()
            .then((res) => {
                console.log('LeetCode raw response:', res)
                // Your backend returns flat object like:
                // { total_solved, easy_solved, medium_solved, hard_solved, acceptance_rate, ranking }
                setData(res)
            })
            .catch((err) => {
                console.error('LeetCode error:', err)
                setError(err.message)
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="card">
                <div className="loading">
                    <div className="spinner"></div>
                    <span>Loading LeetCode data...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="card">
                <div className="error">
                    Error loading LeetCode: {error}
                </div>
            </div>
        )
    }

    if (!data) return null

    // Match your backend's exact response keys
    const total = data.total_solved ?? 0
    const easy = data.easy_solved ?? 0
    const medium = data.medium_solved ?? 0
    const hard = data.hard_solved ?? 0
    const ranking = data.ranking ?? null
    const acceptanceRate = data.acceptance_rate ?? null
    const profileUrl = data.profile_url ?? null

    // LeetCode approximate totals (used for progress rings)
    const TOTAL_QUESTIONS = 3500
    const TOTAL_EASY = 850
    const TOTAL_MEDIUM = 1800
    const TOTAL_HARD = 800

    return (
        <div className="card fade-in">
            <h2 className="card-title">
                LeetCode Progress
                {profileUrl && (
                    <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            marginLeft: 'auto',
                            fontSize: '0.8rem',
                            color: 'var(--primary-light)',
                            textDecoration: 'none'
                        }}
                    >
                        View Profile →
                    </a>
                )}
            </h2>

            <div className="leetcode-stats" style={{ marginBottom: '1.5rem' }}>
                <CircularProgress
                    value={total}
                    max={TOTAL_QUESTIONS}
                    color="#6366f1"
                    label="Total Solved"
                />
                <CircularProgress
                    value={easy}
                    max={TOTAL_EASY}
                    color="#22c55e"
                    label="Easy"
                />
                <CircularProgress
                    value={medium}
                    max={TOTAL_MEDIUM}
                    color="#f59e0b"
                    label="Medium"
                />
            </div>

            <div className="difficulty-stats">
                <div className="difficulty-card easy">
                    <div className="difficulty-count">{easy}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Easy Solved</div>
                    <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
                        {((easy / TOTAL_EASY) * 100).toFixed(1)}% of {TOTAL_EASY}
                    </div>
                </div>
                <div className="difficulty-card medium">
                    <div className="difficulty-count">{medium}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Medium Solved</div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                        {((medium / TOTAL_MEDIUM) * 100).toFixed(1)}% of {TOTAL_MEDIUM}
                    </div>
                </div>
                <div className="difficulty-card hard">
                    <div className="difficulty-count">{hard}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hard Solved</div>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                        {((hard / TOTAL_HARD) * 100).toFixed(1)}% of {TOTAL_HARD}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {ranking !== null && ranking > 0 && (
                    <div style={{
                        flex: 1,
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.05)',
                        borderRadius: 'var(--radius)',
                        textAlign: 'center',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                    }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Global Ranking</span>
                        <div style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '1.25rem' }}>
                            #{ranking.toLocaleString()}
                        </div>
                    </div>
                )}
                {acceptanceRate !== null && acceptanceRate > 0 && (
                    <div style={{
                        flex: 1,
                        padding: '1rem',
                        background: 'rgba(6, 182, 212, 0.05)',
                        borderRadius: 'var(--radius)',
                        textAlign: 'center',
                        border: '1px solid rgba(6, 182, 212, 0.1)',
                    }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Acceptance Rate</span>
                        <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.25rem' }}>
                            {acceptanceRate}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LeetCodeDashboard