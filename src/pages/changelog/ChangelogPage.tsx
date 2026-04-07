import React from 'react'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@components/ui/PageHeader'
import { Tabs } from '@components/ui/Tabs'
import { ROUTES } from '@lib/constants'
import { ChangelogTimeline, useChangelog } from '@features/changelog'

const ChangelogPage: React.FC = () => {
    const { entries, isLoading, currentVersion, source } = useChangelog()

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                kicker="Release Notes"
                title="Changelog"
                description="Historial vivo de producto alimentado automaticamente desde el flujo de desarrollo. Sin notas hardcodeadas ni mantenimiento manual dentro de la app."
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

            <Tabs
                active="changelog"
                items={[
                    { label: 'Reports', value: 'reports', href: ROUTES.REPORTS },
                    { label: 'Changelog', value: 'changelog', href: ROUTES.CHANGELOG },
                    { label: 'Files', value: 'files', href: ROUTES.FILES },
                ]}
            />

            <ChangelogTimeline entries={entries} isLoading={isLoading} />
        </div>
    )
}

export default ChangelogPage
