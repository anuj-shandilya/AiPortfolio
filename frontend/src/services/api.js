import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor
api.interceptors.request.use(
    (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
        return config
    },
    (error) => {
        console.error('[API Request Error]', error)
        return Promise.reject(error)
    }
)

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`)
        return response
    },
    (error) => {
        console.error('[API Response Error]', error.response?.status, error.message)
        return Promise.reject(error)
    }
)

export const fetchGitHubData = async () => {
    const response = await api.get('/github')
    return response.data
}

export const fetchLeetCodeData = async () => {
    const response = await api.get('/leetcode')
    return response.data
}

export const downloadResume = () => {
    window.open(`${API_BASE}/download-resume`, '_blank')
}

export const analyzeJD = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/analyze-jd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

/**
 * Send a chat message and receive a streaming response via SSE.
 * Returns an async generator that yields tokens one by one.
 */
export async function* streamChatMessage(question) {
    const url = `${API_BASE}/chat/stream`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ question }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Chat stream failed: ${response.status} ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') return
                if (!data) continue
                try {
                    const parsed = JSON.parse(data)
                    if (parsed.token) {
                        yield parsed.token
                    }
                    if (parsed.error) {
                        throw new Error(parsed.error)
                    }
                } catch (e) {
                    // If it's not JSON, yield raw text (fallback)
                    if (data && data !== '[DONE]') {
                        yield data
                    }
                }
            }
        }
    }
}

export default api