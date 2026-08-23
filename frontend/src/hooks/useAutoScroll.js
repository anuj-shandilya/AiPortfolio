import { useEffect, useRef } from 'react'

export function useAutoScroll(dependency) {
    const bottomRef = useRef(null)
    const containerRef = useRef(null)
    const shouldScrollRef = useRef(true)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            // Check if user is near bottom (within 100px)
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
            shouldScrollRef.current = isNearBottom
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (shouldScrollRef.current && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [dependency])

    return { containerRef, bottomRef }
}