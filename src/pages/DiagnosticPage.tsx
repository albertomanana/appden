import React from 'react'

/**
 * Debug/Diagnostic page - helps identify what's wrong with the setup
 */
export const DiagnosticPage: React.FC = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const hasMissing = !supabaseUrl || !supabaseKey
    const hasPlaceholders =
        supabaseUrl?.includes('your-project') ||
        supabaseKey?.includes('your-anon-key')

    return (
        <div className="min-h-screen bg-neutral-900 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">🔧 Diagnostic Check</h1>

                {/* Environment Check */}
                <div className="bg-neutral-800 rounded-lg p-6 mb-6 border border-neutral-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Environment Variables</h2>

                    <div className="space-y-3 font-mono text-sm">
                        <div className="flex items-start gap-3">
                            <span className={hasMissing ? '❌' : '✅'}>
                                {supabaseUrl ? 'VITE_SUPABASE_URL' : 'VITE_SUPABASE_URL (MISSING)'}
                            </span>
                            <span className="text-neutral-500">
                                {supabaseUrl ? '✓ Configured' : '✗ Not set'}
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className={!supabaseKey ? '❌' : '✅'}>
                                {supabaseKey ? 'VITE_SUPABASE_ANON_KEY' : 'VITE_SUPABASE_ANON_KEY (MISSING)'}
                            </span>
                            <span className="text-neutral-500">
                                {supabaseKey ? '✓ Configured' : '✗ Not set'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Placeholder Check */}
                {hasPlaceholders && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-red-400 mb-3">⚠️ Placeholder Values Detected</h2>
                        <p className="text-red-300 mb-4">
                            Your .env.local file still contains placeholder values. You need to replace them with real Supabase credentials.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-red-300 text-sm">
                            <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                            <li>Open your project</li>
                            <li>Go to Settings → API</li>
                            <li>Copy your Project URL and anon key</li>
                            <li>Edit .env.local and paste them</li>
                            <li>Restart: npm run dev</li>
                        </ol>
                    </div>
                )}

                {/* Missing Check */}
                {hasMissing && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-red-400 mb-3">❌ Missing Configuration</h2>
                        <p className="text-red-300 mb-4">
                            The .env.local file doesn't have the required variables.
                        </p>
                        <div className="bg-neutral-900 p-4 rounded font-mono text-xs text-neutral-300 mb-4">
                            <p className="text-yellow-400 mb-2">$ cp .env.example .env.local</p>
                            <p className="text-yellow-400">Then edit .env.local with your Supabase credentials</p>
                        </div>
                    </div>
                )}

                {/* Success Check */}
                {!hasMissing && !hasPlaceholders && (
                    <div className="bg-green-500/10 border border-green-500 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-green-400 mb-3">✅ Configuration Looks Good</h2>
                        <p className="text-green-300 mb-4">
                            Your environment variables are set. If you're still having issues:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-green-300 text-sm">
                            <li>Make sure Supabase project is running</li>
                            <li>Check your internet connection</li>
                            <li>Verify the credentials are for an active Supabase project</li>
                            <li>Try: npm run dev again</li>
                        </ol>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
                    <h2 className="text-xl font-semibold text-white mb-4">🚀 Next Steps</h2>
                    <ol className="space-y-3 text-neutral-300">
                        <li>
                            <strong>1. Create .env.local</strong>
                            <div className="bg-neutral-900 p-2 rounded mt-1 font-mono text-xs">cp .env.example .env.local</div>
                        </li>
                        <li>
                            <strong>2. Get Supabase credentials</strong>
                            <p className="text-sm mt-1">Go to supabase.com → Create project → Settings → API</p>
                        </li>
                        <li>
                            <strong>3. Edit .env.local</strong>
                            <div className="bg-neutral-900 p-2 rounded mt-1 font-mono text-xs">
                                VITE_SUPABASE_URL=https://your-id.supabase.co<br/>
                                VITE_SUPABASE_ANON_KEY=your-key
                            </div>
                        </li>
                        <li>
                            <strong>4. Restart dev server</strong>
                            <div className="bg-neutral-900 p-2 rounded mt-1 font-mono text-xs">npm run dev</div>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
