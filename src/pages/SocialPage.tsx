import React, { useEffect, useState } from 'react'
import { postsService } from '@services/posts.service'
import { useAuthStore } from '@app/store/auth.store'
import { Heart } from 'lucide-react'

const SocialPage: React.FC = () => {
    const { user } = useAuthStore()
    const [posts, setPosts] = useState<any[]>([])
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)

    // Using a set to track liked posts IDs locally for faster UI updates
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

    const load = async () => {
        try {
            const data = await postsService.listFeed(30)
            setPosts(data)
            // if we had a likes count/status attached, we would init it here
        } catch (e) {
            console.error('Failed to load feed', e)
        }
    }

    useEffect(() => {
        void load()
    }, [])

    const submit = async () => {
        if (!user || !user.id) return
        if (!content.trim()) return
        setLoading(true)
        try {
            await postsService.createPost(user.id, content.trim())
            setContent('')
            await load()
        } catch (e) {
            console.error('Failed to create post', e)
        } finally {
            setLoading(false)
        }
    }

    const toggleLike = async (postId: string) => {
        if (!user) return
        
        const isLiked = likedPosts.has(postId)
        // Optimistic update
        const newLikes = new Set(likedPosts)
        if (isLiked) {
            newLikes.delete(postId)
        } else {
            newLikes.add(postId)
        }
        setLikedPosts(newLikes)

        try {
            if (isLiked) {
                await postsService.unlikePost(postId, user.id)
            } else {
                await postsService.likePost(postId, user.id)
            }
        } catch (err) {
            // Revert on error
            setLikedPosts(likedPosts)
            console.error('Failed to toggle like', err)
        }
    }

    return (
        <div className="p-6">
            <div className="card p-4 mb-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="¿Qué está pasando? (280 caracteres)"
                    className="input w-full h-24 resize-none"
                    maxLength={280}
                />
                <div className="flex justify-end mt-2">
                    <button className="btn-primary" onClick={submit} disabled={loading || !content.trim()}>
                        {loading ? 'Publicando...' : 'Publicar'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {posts.map((p) => {
                    const isLiked = likedPosts.has(p.id)
                    return (
                        <div key={p.id} className="card p-3">
                            <div className="flex items-center gap-3 mb-2">
                                <img src={p.author?.avatar_url ?? '/icons/avatar-placeholder.svg'} alt="avatar" className="w-8 h-8 rounded-full" />
                                <div>
                                    <div className="font-semibold">{p.author?.display_name ?? 'Usuario'}</div>
                                    <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="whitespace-pre-wrap text-sm mb-3">{p.content}</div>
                            
                            {/* Actions bar */}
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5">
                                <button 
                                    onClick={() => toggleLike(p.id)}
                                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                                        isLiked ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                                    <span>Me gusta</span>
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SocialPage
