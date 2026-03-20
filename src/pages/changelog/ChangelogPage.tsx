import React from 'react'
import { FileText } from 'lucide-react'
import { ChangelogTimeline, useChangelog } from '@features/changelog'

const ChangelogPage: React.FC = () => {
    const { entries, isLoading, currentVersion, source } = useChangelog()

    return (
        <div className="p-4 md:p-6 space-y-5 animate-fade-in">
            <section className="card p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="section-title inline-flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-300" />
                            Changelog
                        </h1>
                        <p className="text-sm text-muted mt-1">
                            Actualizado automaticamente desde commits de la rama develop.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="badge badge-brand">Version {currentVersion}</span>
                        <span className="text-[11px] text-gray-500">fuente: {source}</span>
                    </div>
                </div>
            </section>

            <ChangelogTimeline entries={entries} isLoading={isLoading} />
        </div>
    )
}

export default ChangelogPage

