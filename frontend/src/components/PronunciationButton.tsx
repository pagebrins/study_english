import { Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from './ui/button'
import type { Pronunciation } from '../types/pronunciation'
import { http } from '../services/http'

const resolveAudioURL = (audioURL: string) => {
  if (/^https?:\/\//i.test(audioURL)) return audioURL
  const baseURL = String(http.defaults.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? window.location.origin)
  const resolvedBase = /^https?:\/\//i.test(baseURL) ? new URL(baseURL) : new URL(baseURL, window.location.origin)
  if (audioURL.startsWith('/')) {
    return new URL(audioURL, resolvedBase.origin).toString()
  }
  return new URL(audioURL, `${resolvedBase.toString().replace(/\/$/, '')}/`).toString()
}

type PronunciationButtonProps = {
  pronunciation?: Pronunciation
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export const PronunciationButton = ({
  pronunciation,
  label = 'Play English',
  variant = 'outline',
  size = 'sm',
}: PronunciationButtonProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  if (!pronunciation?.audio_url) return null

  const play = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(resolveAudioURL(pronunciation.audio_url))
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.onerror = () => setPlaying(false)
    }
    try {
      setPlaying(true)
      audioRef.current.src = resolveAudioURL(pronunciation.audio_url)
      await audioRef.current.play()
    } catch {
      setPlaying(false)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void play()} disabled={playing}>
      <Volume2 className="mr-1 h-4 w-4" />
      {playing ? 'Playing...' : label}
    </Button>
  )
}
