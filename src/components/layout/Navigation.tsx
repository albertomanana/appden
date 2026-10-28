import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NAV_SECTIONS, resolveActiveNav } from '@components/layout/navItems'
import { cn } from '@lib/utils'

/**
 * Bottom tab bar for phones (edge-to-edge, safe-area aware).
 * From 768px up the left rail / sidebar replaces it.
 */
export const BottomNav: React.FC = () => {
    const location = useLocation()
    const activeKey = resolveActiveNav(location.pathname).section?.key

    return (
        <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/[0.06] bg-[#0b0b0d]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl safe-left safe-right md:hidden"
        >
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
                {NAV_SECTIONS.map(({ key, icon: Icon, label, to, accent }) => {
                    const active = activeKey === key

                    return (
                        <Link
                            key={key}
                            to={to}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'relative flex min-w-0 flex-col items-center justify-center gap-1 outline-none transition-colors duration-150 active:scale-95 focus-visible:text-white',
                                active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            )}
                        >
                            <span className="relative grid h-8 w-14 place-items-center" style={active ? { color: accent } : undefined}>
                                {active ? (
                                    <motion.span
                                        layoutId="bottom-nav-active-pill"
                                        className="absolute inset-0 rounded-full"
                                        style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)` }}
                                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                    />
                                ) : null}
                                <Icon className="relative h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.9} />
                            </span>
                            <span className={cn('text-[11px] leading-none', active ? 'font-semibold' : 'font-medium')}>{label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
