import { supabase } from './supabase'

const POSTHOG_ENABLED =
    ((import.meta as any).env?.VITE_POSTHOG_ENABLED as string | undefined) === 'true'

const DISTINCT_ID_KEY = 'risaleinurai_posthog_distinct_id'

export const analytics = {
    /**
     * Kullanıcı için kalıcı distinct_id saklar.
     * Genelde Supabase user.id kullanmak en sağlıklısı.
     */
    setDistinctId(id: string) {
        try {
            if (!id) return
            localStorage.setItem(DISTINCT_ID_KEY, id)
        } catch {
            // localStorage hatalarını sessizce yut
        }
    },

    getDistinctId(): string {
        try {
            const stored = localStorage.getItem(DISTINCT_ID_KEY)
            if (stored) return stored
        } catch {
            // ignore
        }
        return 'anonymous'
    },
}

type TrackEventPayload = {
    event: string
    distinct_id?: string
    properties?: Record<string, unknown>
}

export function trackEvent(payload: TrackEventPayload) {
    if (!POSTHOG_ENABLED) return

    const finalDistinctId = payload.distinct_id || analytics.getDistinctId()

        ; (async () => {
            try {
                await supabase.functions.invoke('posthog-proxy', {
                    body: {
                        event: payload.event,
                        distinct_id: finalDistinctId,
                        properties: payload.properties,
                    },
                })
            } catch (error) {
                console.error('PostHog tracking failed', error)
            }
        })()
}
