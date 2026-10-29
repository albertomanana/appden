import React from 'react'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@components/ui/PageHeader'
import { ROUTES } from '@lib/constants'
import { ChangelogTimeline, useChangelog } from '@features/changelog'

const ChangelogPage: React.FC = () => {
    const { entries, isLoading, currentVersion, source } = useChangelog()

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                back={ROUTES.PROFILE}
                title="Novedades"
                description="Lo último que ha cambiado en The Appden."
                meta={
                    <>
                        <span className="hero-meta-pill">
                            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                            Version {currentVersion}
                        </span>
                        <span className="hero-meta-pill">Source: {source}</span>
                    </>
                }
            />

            <ChangelogTimeline entries={entries} isLoading={isLoading} />
        </div>
    )
}

export default ChangelogPage
