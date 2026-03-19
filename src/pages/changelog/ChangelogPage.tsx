import React from 'react'
import { FileText } from 'lucide-react'
import { useActiveGroup } from '@hooks/useActiveGroup'
import { EmptyState } from '@components/ui/EmptyState'
import { ChangelogTimeline, useChangelog } from '@features/changelog'

const ChangelogPage: React.FC = () => {
    const { groupId, activeGroup } = useActiveGroup()
    const { entries, isLoading, currentVersion } = useChangelog(groupId)

    if (!groupId) {
        return (
            <div className="p-4 md:p-6">
                <EmptyState
                    icon={<FileText className="w-7 h-7" />}
                    title="Selecciona un grupo"
                    description="El changelog es privado por grupo y se muestra al elegir uno activo."
                />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <section className="card p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="section-title">Changelog</h1>
                        <p className="text-sm text-muted mt-1">Notas de lanzamiento internas de {activeGroup?.name}</p>
                    </div>
                    <span className="badge badge-brand">Version {currentVersion}</span>
                </div>
            </section>

            <ChangelogTimeline entries={entries} isLoading={isLoading} />
        </div>
    )
}

export default ChangelogPage

