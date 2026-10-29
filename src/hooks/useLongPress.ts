import { useCallback, useRef } from 'react'

type LongPressOptions = {
    /** Hold time in ms before the long press fires. */
    delay?: number
    /** Finger movement (px) that cancels the press, so scrolling never triggers it. */
    moveTolerance?: number
}

/**
 * Long-press for touch and mouse. Spread the returned handlers on the element.
 * When the long press fires, the click that follows the release is swallowed,
 * so the element's normal tap action doesn't also run.
 */
export function useLongPress(onLongPress: () => void, { delay = 450, moveTolerance = 10 }: LongPressOptions = {}) {
    const timer = useRef<number | null>(null)
    const start = useRef<{ x: number; y: number } | null>(null)
    const fired = useRef(false)

    const clear = useCallback(() => {
        if (timer.current != null) window.clearTimeout(timer.current)
        timer.current = null
        start.current = null
    }, [])

    const onPointerDown = useCallback(
        (event: React.PointerEvent) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return
            fired.current = false
            start.current = { x: event.clientX, y: event.clientY }
            timer.current = window.setTimeout(() => {
                fired.current = true
                timer.current = null
                if ('vibrate' in navigator) {
                    try {
                        navigator.vibrate(12)
                    } catch {
                        // Vibration not allowed.
                    }
                }
                onLongPress()
            }, delay)
        },
        [delay, onLongPress]
    )

    const onPointerMove = useCallback(
        (event: React.PointerEvent) => {
            if (!start.current) return
            if (Math.abs(event.clientX - start.current.x) > moveTolerance || Math.abs(event.clientY - start.current.y) > moveTolerance) clear()
        },
        [clear, moveTolerance]
    )

    const onClickCapture = useCallback((event: React.MouseEvent) => {
        if (fired.current) {
            event.preventDefault()
            event.stopPropagation()
            fired.current = false
        }
    }, [])

    // Avoid the native context menu / text selection on long press (iOS, Android).
    const onContextMenu = useCallback((event: React.MouseEvent) => {
        if (fired.current || timer.current != null) event.preventDefault()
    }, [])

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp: clear,
        onPointerLeave: clear,
        onPointerCancel: clear,
        onClickCapture,
        onContextMenu,
    }
}
