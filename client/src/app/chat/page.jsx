"use client"

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { ChatForm } from "@/components/ui/chat"
import { CopyButton } from "@/components/ui/copy-button"
import { MessageInput } from "@/components/ui/message-input"
import { MessageList } from "@/components/ui/message-list"
import { createInitialAssistantStatuses } from "@/components/ui/typing-indicator"
import {
  ThumbsUp,
  ThumbsDown,
  Search,
  Plus,
  Trash2,
  LogOut,
  RotateCcw,
  ChevronDown,
  X,
  BookOpen,
  MessageCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SuggestionDropdown } from "@/components/ui/suggestion-dropdown"
import { fuzzySearch } from "@/services/suggestions/fuzzy"
import Image from "next/image"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { FeedbackDialog } from "@/components/ui/feedback-dialog"
import { toast } from "sonner"
import { TTSButton } from "@/components/ui/tts-button"
import Link from "next/link"
import UnicornScene from "unicornstudio-react"
import { SERVER_URL } from "@/utils/commonHelper"

function normalizeImageResults(raw) {
  if (!Array.isArray(raw)) return undefined
  const normalized = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const data = item
      const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : null
      const pageUrl = typeof data.pageUrl === "string" ? data.pageUrl : null
      const title = typeof data.title === "string" ? data.title : null
      const thumbnailUrl = typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : null
      if (!imageUrl) return null
      return { title, imageUrl, pageUrl, thumbnailUrl }
    })
    .filter((entry) => entry !== null)
  return normalized.length > 0 ? normalized : undefined
}

function applyMermaidReplacements(content, blocks) {
  if (typeof content !== "string" || !Array.isArray(blocks) || blocks.length === 0) return content
  return blocks.reduce((acc, block) => {
    if (typeof block.original === "string" && typeof block.replacement === "string") {
      return acc.replace(block.original, block.replacement)
    }
    return acc
  }, content)
}

export default function ChatPage() {
  const { logout, token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const inputRef = useRef(null)
  const headerRef = useRef(null)
  const footerRef = useRef(null)
  const abortControllerRef = useRef(null)
  const [conversations, setConversations] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [loadingConversationId, setLoadingConversationId] = useState(null)
  const [assistantStatuses, setAssistantStatuses] = useState(createInitialAssistantStatuses())
  const [includeYouTube, setIncludeYouTube] = useState(false)
  const [includeImageSearch, setIncludeImageSearch] = useState(false)
  const [viewportHeight, setViewportHeight] = useState("100dvh")
  const [historyQuery, setHistoryQuery] = useState("")
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const displayName = user?.username || user?.name || "User"
  const displayEmail = user?.email ?? ""
  const userInitial = useMemo(() => {
    const source = user?.email || user?.username || user?.name
    return source ? source.slice(0, 1).toUpperCase() : "U"
  }, [user])
  const userAvatar = user?.profileImageUrl || user?.avatarUrl || null

  const { salutation, firstName } = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const base = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
    return { salutation: base, firstName: displayName?.split(" ")[0] ?? "there" }
  }, [displayName])

  const [layoutHeights, setLayoutHeights] = useState({ header: 64, footer: 88 })

  useEffect(() => {
    const updateHeights = () => {
      setLayoutHeights({
        header: headerRef.current?.offsetHeight ?? 64,
        footer: footerRef.current?.offsetHeight ?? 88,
      })
    }
    updateHeights()
    window.addEventListener("resize", updateHeights)
    return () => window.removeEventListener("resize", updateHeights)
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === "undefined") return
      const viewport = window.visualViewport
      const height = viewport?.height ?? window.innerHeight
      setViewportHeight(`${height}px`)
    }
    updateViewport()
    const viewport = typeof window !== "undefined" ? window.visualViewport : null
    viewport?.addEventListener("resize", updateViewport)
    viewport?.addEventListener("scroll", updateViewport)
    window.addEventListener("orientationchange", updateViewport)
    window.addEventListener("resize", updateViewport)
    return () => {
      viewport?.removeEventListener("resize", updateViewport)
      viewport?.removeEventListener("scroll", updateViewport)
      window.removeEventListener("orientationchange", updateViewport)
      window.removeEventListener("resize", updateViewport)
    }
  }, [])

  const getSessionId = useCallback(() => {
    if (typeof window === "undefined") return "futureos-server"
    const storageKey = "futureos_session_id"
    let sessionId = window.localStorage.getItem(storageKey)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      window.localStorage.setItem(storageKey, sessionId)
    }
    return sessionId
  }, [])

  const getRequestHeaders = useCallback((baseHeaders = {}) => ({
    ...baseHeaders,
    "X-Session-Id": getSessionId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [getSessionId, token])

  const formatConversationDate = useCallback((iso) => {
    if (!iso) return ""
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }).format(date)
  }, [])

  const normalizeConversationSummary = useCallback((conversation) => {
    if (!conversation || typeof conversation !== "object" || !conversation.id) return null
    const id = String(conversation.id)
    const rawTitle = conversation.title ?? conversation.name ?? ""
    const title = String(rawTitle).trim() || `Chat ${id.slice(0, 6) || id}`
    const updatedAt = conversation.updated_at ?? conversation.updatedAt ?? conversation.created_at ?? conversation.createdAt ?? null
    const createdAt = conversation.created_at ?? conversation.createdAt ?? conversation.updated_at ?? conversation.updatedAt ?? null
    return { id, title, updated_at: updatedAt ?? null, created_at: createdAt ?? null }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      const resp = await fetch(`${SERVER_URL}/api/chat/conversations`, {
        headers: getRequestHeaders(),
      })
      if (!resp.ok) throw new Error((await resp.text()) || "Failed to fetch conversations")
      const data = await resp.json()
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeConversationSummary).filter((c) => c !== null)
        const getTime = (c) => {
          const t = new Date(c.updated_at ?? c.created_at ?? "").getTime()
          return Number.isNaN(t) ? 0 : t
        }
        normalized.sort((a, b) => getTime(b) - getTime(a))
        setConversations(normalized)
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error("Failed to load conversations", error)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [getRequestHeaders, normalizeConversationSummary])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { if (!currentConversationId) return; loadConversations() }, [currentConversationId, loadConversations])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      if (isHistoryOpen && !(target instanceof Element && target.closest(".history-dropdown"))) setIsHistoryOpen(false)
      if (isProfileOpen && !(target instanceof Element && target.closest(".profile-dropdown"))) setIsProfileOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isHistoryOpen, isProfileOpen])

  const stop = useCallback(() => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null }
    setIsGenerating(false)
    setAssistantStatuses(createInitialAssistantStatuses())
  }, [])

  const startNewChat = useCallback(() => {
    stop()
    setMessages([])
    setCurrentConversationId(null)
    setInput("")
    setShowSuggestions(false)
    setLoadingConversationId(null)
    setAssistantStatuses(createInitialAssistantStatuses())
    setIsProfileOpen(false)
  }, [stop])

  const normalizeMessageFromHistory = useCallback((message) => {
    const role = message?.role === "model" ? "assistant" : message?.role ?? "assistant"
    const createdAtIso = message?.created_at ?? message?.createdAt
    const normalizedVideos = Array.isArray(message?.videos) ? message.videos : undefined
    return {
      id: message?.id ? String(message.id) : crypto.randomUUID(),
      role: role === "assistant" || role === "user" || role === "system" ? role : "assistant",
      content: message?.content ?? "",
      createdAt: createdAtIso ? new Date(createdAtIso) : undefined,
      sources: Array.isArray(message?.sources) ? message.sources : undefined,
      chartUrl: typeof message?.charts === "string" ? message.charts : Array.isArray(message?.charts) ? message.charts[0] : undefined,
      chartUrls: Array.isArray(message?.charts)
        ? message.charts.filter((url) => typeof url === "string" && url.trim().length > 0)
        : typeof message?.charts === "string" && message.charts.trim().length > 0 ? [message.charts] : undefined,
      excalidrawData: message.excalidraw ?? message.excalidraw_data ?? message.excalidrawData ?? undefined,
      images: normalizeImageResults(message?.images),
      videos: normalizedVideos,
    }
  }, [])

  const attachPromptTitlesToHistory = useCallback((historyMessages) => {
    let lastUserContent
    return historyMessages.map((msg) => {
      if (msg.role === "user") { lastUserContent = msg.content || ""; return msg }
      if (msg.role === "assistant" && !msg.promptTitle && lastUserContent && lastUserContent.trim().length > 0) {
        return { ...msg, promptTitle: lastUserContent }
      }
      return msg
    })
  }, [])

  const handleConversationSelect = useCallback(async (conversationId) => {
    stop()
    setLoadingConversationId(conversationId)
    setIsHistoryOpen(false)
    setIsProfileOpen(false)
    try {
      const resp = await fetch(`${SERVER_URL}/api/chat/conversations/${conversationId}`, {
        headers: getRequestHeaders(),
      })
      if (!resp.ok) throw new Error((await resp.text()) || "Failed to load conversation")
      const data = await resp.json()
      const historyMessages = Array.isArray(data?.messages)
        ? [...data.messages]
            .sort((a, b) => {
              const aTime = new Date(a?.created_at ?? a?.createdAt ?? 0).getTime()
              const bTime = new Date(b?.created_at ?? b?.createdAt ?? 0).getTime()
              if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
              if (Number.isNaN(aTime)) return -1
              if (Number.isNaN(bTime)) return 1
              return aTime - bTime
            })
            .map(normalizeMessageFromHistory)
        : []
      const historyWithTitles = attachPromptTitlesToHistory(historyMessages)
      setMessages(historyWithTitles)
      setCurrentConversationId(data?.id ? String(data.id) : conversationId)
      setInput("")
      setShowSuggestions(false)
      setIsGenerating(false)
      setAssistantStatuses(createInitialAssistantStatuses())
    } catch (error) {
      console.error("Failed to load conversation history", error)
    } finally {
      setLoadingConversationId(null)
    }
  }, [attachPromptTitlesToHistory, getRequestHeaders, normalizeMessageFromHistory, stop])

  const handleDeleteConversation = useCallback(async (conversationId, event) => {
    event?.preventDefault()
    event?.stopPropagation()
    try {
      const resp = await fetch(`${SERVER_URL}/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
        headers: getRequestHeaders(),
      })
      if (!resp.ok) throw new Error((await resp.text()) || "Failed to delete conversation")
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      if (currentConversationId === conversationId) startNewChat()
    } catch (error) {
      console.error("Failed to delete conversation", error)
    }
  }, [currentConversationId, getRequestHeaders, startNewChat])

  const filteredSuggestions = useMemo(() => {
    if (!input || input.trim().length < 2) return []
    return fuzzySearch(input).slice(0, 5)
  }, [input])

  const filteredHistory = useMemo(() => {
    if (!historyQuery.trim()) return conversations
    const query = historyQuery.toLowerCase()
    return conversations.filter((c) => {
      const title = c.title || `Chat ${c.id.slice(0, 6)}`
      return title.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
    })
  }, [historyQuery, conversations])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const handleSuggestionSelect = (suggestion) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const simulateAssistant = async (userContent, attachments) => {
    try {
      const conversationId = currentConversationId
      abortControllerRef.current = new AbortController()

      if (attachments && attachments.length > 0) {
        toast.info("File attachments are disabled on /api/chat while middleware is removed.")
      }
      const response = await fetch(`${SERVER_URL}/api/chat/stream`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ prompt: userContent, conversationId: conversationId || undefined, options: { includeYouTube, includeImageSearch } }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error((await response.text()) || "Failed to get response from the API")

      setAssistantStatuses((prev) => ({ ...prev, searching: "complete", responding: "active" }))

      const assistantMessageId = crypto.randomUUID()
      setMessages((prev) => [...prev, {
        id: assistantMessageId, role: "assistant", content: "", createdAt: new Date(),
        sources: [], chartUrl: null, chartUrls: [], images: [], promptTitle: userContent, isComplete: false,
      }])

      let resolvedConversationId = conversationId || null
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamedContent = ""
      let streamedSources = []
      let streamedImages = []
      let streamedVideos = []
      let streamedCodeSnippets = []
      let streamedExecutionOutputs = []
      let streamedMermaidBlocks
      let streamedFutureOs = null
      let currentEvent = ""
      let updateTimer = null
      let pendingUpdate = false

      const processSseLine = (line) => {
        if (!line.trim()) { currentEvent = ""; return }
        if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); return }
        if (!line.startsWith("data: ")) return
        const data = line.slice(6).trim()
        if (!data) return
        try {
          const parsed = JSON.parse(data)
          if (currentEvent === "conversationId" || parsed.conversationId) {
            resolvedConversationId = parsed.conversationId
            if (parsed.conversationId !== currentConversationId) setCurrentConversationId(parsed.conversationId)
          } else if (currentEvent === "message" && parsed.text && typeof parsed.text === "string") {
            streamedContent += parsed.text
            if (!pendingUpdate) {
              pendingUpdate = true
              if (updateTimer) clearTimeout(updateTimer)
              updateTimer = setTimeout(() => {
                setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, content: streamedContent, createdAt: new Date(), isComplete: false } : msg))
                pendingUpdate = false
              }, 50)
            }
          } else if (currentEvent === "images" && parsed.images && Array.isArray(parsed.images)) {
            const normalized = normalizeImageResults(parsed.images)
            if (normalized) { streamedImages = normalized; setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, images: normalized } : msg)) }
          } else if (currentEvent === "sources" && parsed.sources && Array.isArray(parsed.sources)) {
            streamedSources = parsed.sources
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, sources: streamedSources } : msg))
          } else if (currentEvent === "code" && parsed.code) {
            streamedCodeSnippets = [...(streamedCodeSnippets ?? []), { language: typeof parsed.language === "string" ? parsed.language : undefined, code: String(parsed.code) }]
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, codeSnippets: streamedCodeSnippets } : msg))
          } else if (currentEvent === "codeResult" && parsed.output) {
            streamedExecutionOutputs = [...(streamedExecutionOutputs ?? []), { outcome: typeof parsed.outcome === "string" ? parsed.outcome : undefined, output: String(parsed.output) }]
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, executionOutputs: streamedExecutionOutputs } : msg))
          } else if (currentEvent === "mermaid" && Array.isArray(parsed.blocks)) {
            streamedMermaidBlocks = parsed.blocks
            const updatedContent = applyMermaidReplacements(streamedContent, streamedMermaidBlocks)
            if (updatedContent !== streamedContent) streamedContent = updatedContent
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, content: streamedContent, mermaidBlocks: streamedMermaidBlocks, isComplete: false } : msg))
          } else if (currentEvent === "youtubeResults" && parsed.videos && Array.isArray(parsed.videos)) {
            streamedVideos = parsed.videos
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, videos: parsed.videos } : msg))
          } else if (currentEvent === "futureos" && parsed.data) {
            streamedFutureOs = {
              intent: typeof parsed.intent === "string" ? parsed.intent : null,
              data: parsed.data,
            }
            if (parsed.data?.sources && Array.isArray(parsed.data.sources)) {
              streamedSources = parsed.data.sources
              setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, sources: streamedSources } : msg))
            }
          } else if (currentEvent === "excalidraw" && parsed.excalidrawData && Array.isArray(parsed.excalidrawData)) {
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, excalidrawData: parsed.excalidrawData } : msg))
          } else if (currentEvent === "finish" && parsed.finishReason) {
            setAssistantStatuses((prev) => ({ ...prev, responding: "complete" }))
          } else if (currentEvent === "error" && parsed.error) {
            throw new Error(parsed.error)
          }
        } catch (parseError) {
          if (data !== "[DONE]") console.warn("Failed to parse SSE data:", data, parseError)
        }
      }

      if (!reader) throw new Error("No response body reader available")

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim().length > 0) {
            for (const line of buffer.split("\n")) { if (line) processSseLine(line) }
            buffer = ""
          }
          if (updateTimer) {
            clearTimeout(updateTimer)
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? { ...msg, content: streamedContent, createdAt: new Date() } : msg))
          }
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) processSseLine(line)
      }

      const finalContent = streamedContent || "I couldn't fetch the details. Please try again later."
      setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? {
        ...msg, content: finalContent, sources: streamedSources, chartUrl: msg.chartUrl, chartUrls: msg.chartUrls ?? [],
        images: streamedImages.length > 0 ? streamedImages : msg.images, videos: streamedVideos.length > 0 ? streamedVideos : msg.videos,
        codeSnippets: streamedCodeSnippets, executionOutputs: streamedExecutionOutputs, mermaidBlocks: streamedMermaidBlocks, futureOs: streamedFutureOs, createdAt: new Date(), isComplete: true,
      } : msg))

      const chartsConversationId = resolvedConversationId ?? currentConversationId
      if (!abortControllerRef.current?.signal.aborted && chartsConversationId) {
        setAssistantStatuses((prev) => ({ ...prev, charting: "active" }))
        try {
          const chartsResponse = await fetch(`${SERVER_URL}/api/proxy/charts`, {
            method: "POST",
            headers: getRequestHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ prompt: userContent, conversationId: chartsConversationId, options: { includeSearch: true, includeYouTube } }),
          })
          if (chartsResponse.ok) {
            const chartData = await chartsResponse.json()
            const chartUrlFromResponse = chartData?.chartUrl || chartData?.charts?.chartUrl
            if (typeof chartUrlFromResponse === "string" && chartUrlFromResponse.trim().length > 0) {
              setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId ? {
                ...msg, chartUrl: chartUrlFromResponse, chartUrls: Array.from(new Set([...(msg.chartUrls ?? []), chartUrlFromResponse])),
              } : msg))
            }
            setAssistantStatuses((prev) => ({ ...prev, charting: "complete" }))
          } else {
            throw new Error(await chartsResponse.text())
          }
        } catch (chartErr) {
          console.error("Chart fetch after chat failed:", chartErr)
          setAssistantStatuses((prev) => ({ ...prev, charting: "pending" }))
        }
      }
    } catch (error) {
      if (error.name === "AbortError") return
      console.error("Error in streaming:", error)
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I encountered an error while processing your request. Please try again.", createdAt: new Date() }])
      setAssistantStatuses(createInitialAssistantStatuses())
    }
  }

  const handleSubmit = (event, options) => {
    event?.preventDefault?.()
    if (!input && !options?.experimental_attachments?.length) return
    const newMessage = {
      id: crypto.randomUUID(), role: "user", content: input || "(sent with attachments)", createdAt: new Date(),
      experimental_attachments: options?.experimental_attachments
        ? Array.from(options.experimental_attachments).map((f) => ({ name: f.name, contentType: f.type, url: "data:;base64," }))
        : undefined,
    }
    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setIsGenerating(true)
    simulateAssistant(newMessage.content, options?.experimental_attachments).finally(() => {
      setIsGenerating(false)
      abortControllerRef.current = null
    })
  }

  const onRateResponse = (messageId, rating) => {
    toast.success(rating === "thumbs-up" ? "Marked response as helpful" : "Marked response as not helpful", { description: "Thanks for your feedback!" })
  }

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")
      const response = await fetch(`${SERVER_URL}/api/speech/transcribe`, { method: "POST", body: formData })
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Failed to transcribe audio") }
      const data = await response.json()
      if (data.success && data.text) return data.text
      throw new Error("No transcription returned")
    } catch (error) {
      console.error("Transcription error:", error)
      throw error
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

        .chat-root {
          --accent: #B75A39;
          --accent-glow: rgba(183, 90, 57, 0.35);
          --accent-dim: rgba(183, 90, 57, 0.12);
          --glass-bg: rgba(255, 255, 255, 0.06);
          --glass-border: rgba(255, 255, 255, 0.1);
          --glass-blur: blur(24px);
          --panel-bg: rgba(12, 12, 20, 0.72);
          --panel-border: rgba(255,255,255,0.08);
          --text-primary: rgba(240, 235, 228, 0.95);
          --text-secondary: rgba(200, 190, 178, 0.6);
          --font-display: 'Syne', sans-serif;
          --font-body: 'Space Grotesk', sans-serif;
        }

        .chat-root * { font-family: var(--font-body); box-sizing: border-box; }

        /* Scanline overlay */
        .chat-root::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
        }

        /* Glowing corner brackets */
        .corner-bracket {
          position: absolute;
          width: 14px;
          height: 14px;
          border-color: var(--accent);
          border-style: solid;
          opacity: 0.5;
        }
        .corner-bracket.tl { top: 0; left: 0; border-width: 1.5px 0 0 1.5px; }
        .corner-bracket.tr { top: 0; right: 0; border-width: 1.5px 1.5px 0 0; }
        .corner-bracket.bl { bottom: 0; left: 0; border-width: 0 0 1.5px 1.5px; }
        .corner-bracket.br { bottom: 0; right: 0; border-width: 0 1.5px 1.5px 0; }

        .hud-header {
          background: rgba(8, 8, 14, 0.78);
          border-bottom: 1px solid rgba(183, 90, 57, 0.18);
          backdrop-filter: blur(32px) saturate(1.4);
          -webkit-backdrop-filter: blur(32px) saturate(1.4);
        }

        .hud-logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }

        .hud-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          height: 32px;
          padding: 0 14px;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: rgba(200, 190, 178, 0.7);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          white-space: nowrap;
          text-decoration: none;
        }
        .hud-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(183,90,57,0.15), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .hud-btn:hover {
          color: #e8d5c6;
          border-color: rgba(183, 90, 57, 0.35);
          box-shadow: 0 0 12px rgba(183, 90, 57, 0.15), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .hud-btn:hover::after { opacity: 1; }

        .hud-profile-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 36px;
          padding: 0 12px 0 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(200, 190, 178, 0.7);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hud-profile-btn:hover {
          color: #e8d5c6;
          border-color: rgba(183, 90, 57, 0.35);
          box-shadow: 0 0 16px rgba(183, 90, 57, 0.2);
        }

        .hud-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #B75A39, #7a3d26);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 0.7rem;
          font-weight: 700;
          color: white;
          border: 1px solid rgba(183, 90, 57, 0.5);
          flex-shrink: 0;
        }

        /* Dropdown panel */
        .hud-dropdown {
          position: absolute;
          z-index: 50;
          top: calc(100% + 10px);
          min-width: 300px;
          background: rgba(10, 10, 18, 0.94);
          border: 1px solid rgba(183, 90, 57, 0.2);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 40px rgba(183,90,57,0.08);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
        }

        .hud-dropdown-header {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 10px;
        }

        .hud-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          font-size: 0.78rem;
          color: rgba(200, 190, 178, 0.75);
          background: transparent;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .hud-dropdown-item:hover {
          background: rgba(183, 90, 57, 0.12);
          color: #e8d5c6;
        }

        .conv-item {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .conv-item:hover { background: rgba(255,255,255,0.04); }
        .conv-item.active { background: rgba(183, 90, 57, 0.1); }

        .conv-btn {
          flex: 1;
          min-width: 0;
          padding: 8px 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          border-radius: 8px;
        }

        .conv-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(220, 210, 200, 0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .conv-date {
          font-size: 0.65rem;
          color: rgba(180, 170, 160, 0.45);
          margin-top: 2px;
        }

        .conv-delete {
          padding: 5px;
          background: transparent;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          color: rgba(180,170,160,0.35);
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .conv-delete:hover { background: rgba(220,50,50,0.12); color: #f87171; }

        .search-input {
          width: 100%;
          height: 36px;
          padding: 0 10px 0 32px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          font-size: 0.75rem;
          color: rgba(220,210,200,0.9);
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: rgba(180,170,160,0.35); }
        .search-input:focus { border-color: rgba(183,90,57,0.4); box-shadow: 0 0 0 3px rgba(183,90,57,0.08); }

        /* Welcome screen */
        .welcome-panel {
          background: rgba(10, 10, 18, 0.72);
          border: 1px solid rgba(183, 90, 57, 0.15);
          border-radius: 20px;
          backdrop-filter: blur(40px) saturate(1.3);
          -webkit-backdrop-filter: blur(40px) saturate(1.3);
          box-shadow: 0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(183,90,57,0.06) inset;
          padding: 48px 40px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .welcome-panel::before {
          content: '';
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(183,90,57,0.12), transparent 70%);
          pointer-events: none;
        }

        .welcome-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          background: rgba(183,90,57,0.1);
          border: 1px solid rgba(183,90,57,0.25);
          border-radius: 20px;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(200, 150, 110, 0.8);
          margin-bottom: 28px;
        }

        .welcome-greeting {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .welcome-greeting .name-highlight {
          background: linear-gradient(135deg, #e8c4a8, #B75A39, #7a3d26);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-style: italic;
        }

        .welcome-sub {
          font-size: 0.9rem;
          color: var(--text-secondary);
          max-width: 380px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }

        .welcome-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }
        .welcome-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          font-size: 0.72rem;
          color: rgba(200,190,178,0.55);
          transition: all 0.2s;
        }
        .welcome-pill:hover {
          border-color: rgba(183,90,57,0.3);
          color: rgba(220,200,185,0.75);
          background: rgba(183,90,57,0.07);
        }
        .welcome-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #B75A39;
          box-shadow: 0 0 6px rgba(183,90,57,0.6);
          flex-shrink: 0;
        }

        /* Messages panel */
        .messages-panel {
          background: rgba(8, 8, 16, 0.68);
          border: 1px solid rgba(183,90,57,0.12);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.4);
          position: relative;
        }

        /* Footer input area */
        .hud-footer {
          background: rgba(8, 8, 14, 0.85);
          border-top: 1px solid rgba(183,90,57,0.15);
          backdrop-filter: blur(32px) saturate(1.4);
          -webkit-backdrop-filter: blur(32px) saturate(1.4);
        }
        .hud-footer::before {
          content: '';
          position: absolute;
          inset-x-0;
          top: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(183,90,57,0.4), transparent);
        }

        /* Mobile menu */
        .mobile-menu-panel {
          background: rgba(8, 8, 16, 0.95);
          border: 1px solid rgba(183,90,57,0.2);
          border-radius: 16px;
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.7);
        }

        /* Scrollbar */
        .hud-scroll::-webkit-scrollbar { width: 4px; }
        .hud-scroll::-webkit-scrollbar-track { background: transparent; }
        .hud-scroll::-webkit-scrollbar-thumb { background: rgba(183,90,57,0.25); border-radius: 2px; }
        .hud-scroll::-webkit-scrollbar-thumb:hover { background: rgba(183,90,57,0.4); }

        /* Pulse dot */
        @keyframes pulse-dot { 0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(183,90,57,0.8); } 50% { opacity: 0.4; box-shadow: 0 0 2px rgba(183,90,57,0.2); } }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        /* Spin animation */
        @keyframes spin-slow { from { transform: translateX(-50%) translateY(-50%) rotate(0deg); } to { transform: translateX(-50%) translateY(-50%) rotate(360deg); } }
        .spin-slow { animation: spin-slow 18s linear infinite; }

        /* Horizontal divider line */
        .hud-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(183,90,57,0.25), transparent);
          margin: 10px 0;
        }
      `}</style>

      <div
        className="chat-root relative flex flex-col overflow-hidden"
        style={{ minHeight: viewportHeight, color: "var(--text-primary)" }}
      >
        {/* ── Unicorn Studio background ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0"
          style={{ zIndex: 0, height: viewportHeight }}
        >
          <div className="absolute inset-0" style={{ opacity: 0.6 }}>
            <UnicornScene
              projectId="MdKKEse3xqRLzs9KY2Yg"
              sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.3/dist/unicornStudio.umd.js"
              width="100%"
              height="100%"
            />
          </div>
          {/* Dark vignette overlay */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(5,5,10,0.55) 0%, rgba(5,5,10,0.88) 80%)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(rgba(183,90,57,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(183,90,57,0.04) 1px, transparent 1px)", backgroundSize: "80px 80px", opacity: 0.4 }} />
        </div>

        {/* ── Header ── */}
        <header
          ref={headerRef}
          className="hud-header fixed inset-x-0 top-0 z-20 px-4 sm:px-6"
          style={{ paddingTop: "calc(14px + env(safe-area-inset-top, 0px))", paddingBottom: "14px" }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">

            {/* Left: back + logo */}
            <div className="flex items-center gap-3">
              {/* <Image src="/logo14.png" alt="RegIntel logo" width={32} height={32} style={{ borderRadius: 8, border: "1px solid rgba(183,90,57,0.3)" }} /> */}
              <span className="hud-logo-text">FutureOS<span style={{ color: "#B75A39" }}>AI</span></span>
            </div>

            {/* Desktop center actions */}
            <div className="hidden md:flex items-center gap-2">
              <button type="button" className="hud-btn" onClick={startNewChat}>
                <Plus style={{ width: 13, height: 13 }} /> New chat
              </button>

              {/* History dropdown */}
              <div className="history-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="hud-btn"
                  onClick={() => {
                    setIsProfileOpen(false)
                    setIsHistoryOpen((v) => {
                      const next = !v
                      if (next && !isHistoryLoading && conversations.length === 0) void loadConversations()
                      if (!next) setHistoryQuery("")
                      return next
                    })
                  }}
                >
                  <Search style={{ width: 13, height: 13 }} /> History
                </button>

                {isHistoryOpen && (
                  <div className="hud-dropdown" style={{ left: "50%", transform: "translateX(-50%)", width: 380 }}>
                    <div className="corner-bracket tl" /><div className="corner-bracket tr" />
                    <div className="corner-bracket bl" /><div className="corner-bracket br" />
                    <div className="hud-dropdown-header">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>Search chats</p>
                          <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>Browse and reopen conversations</p>
                        </div>
                        <button type="button" className="hud-btn" style={{ height: 26, padding: "0 10px", fontSize: "0.7rem" }} onClick={startNewChat}>
                          <Plus style={{ width: 11, height: 11 }} /> New
                        </button>
                      </div>
                      <div style={{ position: "relative" }}>
                        <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(180,170,160,0.4)", pointerEvents: "none" }} />
                        <input
                          type="text"
                          value={historyQuery}
                          onChange={(e) => setHistoryQuery(e.target.value)}
                          placeholder="Search conversations…"
                          className="search-input"
                        />
                      </div>
                    </div>

                    <div className="hud-scroll" style={{ maxHeight: 280, overflowY: "auto", overflowX: "hidden" }}>
                      {isHistoryLoading ? (
                        <p style={{ padding: "20px 12px", textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Loading…</p>
                      ) : conversations.length === 0 ? (
                        <p style={{ padding: "20px 12px", textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)" }}>No conversations yet</p>
                      ) : filteredHistory.length === 0 ? (
                        <p style={{ padding: "20px 12px", textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)" }}>No results for "{historyQuery}"</p>
                      ) : (
                        <ul style={{ padding: "4px 0", listStyle: "none", margin: 0 }}>
                          {filteredHistory.map((conv) => {
                            const isActive = currentConversationId === conv.id
                            const ts = formatConversationDate(conv.updated_at ?? conv.created_at)
                            return (
                              <li key={conv.id}>
                                <div className={`conv-item${isActive ? " active" : ""}`} style={{ padding: "2px 4px" }}>
                                  <button className="conv-btn" onClick={() => handleConversationSelect(conv.id)} type="button">
                                    <div className="conv-title">{conv.title || `Chat ${conv.id.slice(0, 6)}`}</div>
                                    {ts && <div className="conv-date">{ts}</div>}
                                    {loadingConversationId === conv.id && <div style={{ fontSize: "0.65rem", color: "#B75A39", marginTop: 2 }}>Loading…</div>}
                                  </button>
                                  <button className="conv-delete" onClick={(e) => handleDeleteConversation(conv.id, e)} title="Delete" type="button">
                                    <Trash2 style={{ width: 13, height: 13 }} />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="hud-btn" onClick={() => toast("Library is coming soon")}>
                <BookOpen style={{ width: 13, height: 13 }} /> Library
              </button>

              <button type="button" className="hud-btn" onClick={() => setIsFeedbackOpen(true)}>
                <MessageCircle style={{ width: 13, height: 13 }} /> Feedback
              </button>
            </div>

            {/* Desktop right: profile */}
            <div className="hidden md:flex items-center gap-2">
              <div className="profile-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="hud-profile-btn"
                  onClick={() => { setIsHistoryOpen(false); setIsProfileOpen((v) => !v) }}
                >
                  {userAvatar
                    ? <img src={userAvatar} alt={displayName} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(183,90,57,0.4)" }} referrerPolicy="no-referrer" />
                    : <div className="hud-avatar">{userInitial}</div>
                  }
                  <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>Profile</span>
                  <ChevronDown style={{ width: 13, height: 13, transition: "transform 0.3s", transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>

                {isProfileOpen && (
                  <div className="hud-dropdown" style={{ right: 0, width: 240 }}>
                    <div className="corner-bracket tl" /><div className="corner-bracket tr" />
                    <div className="corner-bracket bl" /><div className="corner-bracket br" />
                    <div className="hud-dropdown-header" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {userAvatar
                        ? <img src={userAvatar} alt={displayName} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(183,90,57,0.4)", flexShrink: 0 }} referrerPolicy="no-referrer" />
                        : <div className="hud-avatar" style={{ width: 44, height: 44, fontSize: "1rem" }}>{userInitial}</div>
                      }
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                        {displayEmail && <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayEmail}</div>}
                      </div>
                    </div>
                    <div className="hud-divider" />
                    <button type="button" className="hud-dropdown-item" onClick={() => { setIsProfileOpen(false); logout() }}>
                      <LogOut style={{ width: 13, height: 13 }} /> Logout
                    </button>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Theme</span>
                      <ThemeToggle />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: viewportHeight,
            paddingTop: messages.length > 0 ? `${layoutHeights.header}px` : 0,
            paddingBottom: messages.length > 0 ? `${layoutHeights.footer}px` : 0,
          }}
        >
          <div className={`h-full ${messages.length > 0 ? "hud-scroll overflow-y-auto" : "overflow-hidden"}`}>
            <div className={`min-h-full px-4 sm:px-6 ${messages.length === 0 ? "" : "py-6 sm:py-8"}`}>
              <div className="mx-auto w-full max-w-4xl">
                {messages.length === 0 ? (
                  <div
                    className="fixed inset-x-0 grid place-items-center px-4 sm:px-6"
                    style={{ top: layoutHeights.header, bottom: layoutHeights.footer }}
                  >
                    <div className="welcome-panel w-full max-w-2xl mx-auto">
                      <div className="corner-bracket tl" /><div className="corner-bracket tr" />
                      <div className="corner-bracket bl" /><div className="corner-bracket br" />

                      {/* Spinning conic glow */}
                      <div style={{ position: "absolute", top: "50%", left: "50%", width: "28rem", height: "28rem", pointerEvents: "none", zIndex: 0 }}
                        className="spin-slow"
                      >
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "conic-gradient(from 0deg, rgba(183,90,57,0.15), transparent, rgba(183,90,57,0.1), transparent)", filter: "blur(20px)", opacity: 0.4 }} />
                      </div>

                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div className="welcome-badge">
                          <span className="pulse-dot" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#B75A39" }} />
                          Neural console online
                        </div>

                        <h2 className="welcome-greeting">
                          {salutation},
                          <br />
                          <span className="name-highlight">{firstName}</span>
                        </h2>

                        <p className="welcome-sub">
                          A futuristic command center for market intelligence, compliance signals, and strategic synthesis.
                        </p>

                        <div className="welcome-pills">
                          {["Evidence-backed insights", "Live charts & visuals", "Multimodal research"].map((label) => (
                            <div key={label} className="welcome-pill">
                              <span className="welcome-pill-dot" />
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full space-y-6">
                    <div className="messages-panel">
                      <div className="corner-bracket tl" /><div className="corner-bracket tr" />
                      <div className="corner-bracket bl" /><div className="corner-bracket br" />
                      <MessageList
                        messages={messages}
                        isTyping={isGenerating}
                        typingStatuses={assistantStatuses}
                        messageOptions={(message) => {
                          if (message.role === "user") return {}
                          return {
                            actions: onRateResponse ? (
                              <>
                                <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                  <TTSButton content={message.content} />
                                  <CopyButton content={message.content} copyMessage="Copied response to clipboard!" />
                                </div>
                                <button type="button" className="hud-btn" style={{ width: 26, height: 26, padding: 0, justifyContent: "center", borderRadius: "50%" }}
                                  onClick={() => onRateResponse(message.id, "thumbs-up")}>
                                  <ThumbsUp style={{ width: 13, height: 13 }} />
                                </button>
                                <button type="button" className="hud-btn" style={{ width: 26, height: 26, padding: 0, justifyContent: "center", borderRadius: "50%" }}
                                  onClick={() => onRateResponse(message.id, "thumbs-down")}>
                                  <ThumbsDown style={{ width: 13, height: 13 }} />
                                </button>
                              </>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <TTSButton content={message.content} />
                                <CopyButton content={message.content} copyMessage="Copied response to clipboard!" />
                              </div>
                            ),
                            isComplete: message.isComplete,
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Input Footer ── */}
        <div
          ref={footerRef}
          className="hud-footer fixed bottom-0 left-0 right-0"
          style={{ zIndex: 30 }}
        >
          {/* Top glow line */}
          <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg, transparent, rgba(183,90,57,0.45), transparent)", pointerEvents: "none" }} />

          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6" style={{ position: "relative" }}>
            {/* Ambient glow behind input */}
            <div style={{ position: "absolute", insetX: "10%", top: 0, height: 60, background: "radial-gradient(ellipse at 50% 0%, rgba(183,90,57,0.18), transparent 70%)", pointerEvents: "none", filter: "blur(12px)" }} />
            <ChatForm isPending={isGenerating} handleSubmit={handleSubmit}>
              {({ files, setFiles }) => (
                <div style={{ position: "relative" }}>
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <SuggestionDropdown
                      suggestions={filteredSuggestions}
                      onSelect={handleSuggestionSelect}
                      inputValue={input}
                      className="w-full"
                    />
                  )}
                  <MessageInput
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === "Escape") setShowSuggestions(false) }}
                    stop={stop}
                    isGenerating={isGenerating}
                    transcribeAudio={transcribeAudio}
                    inputRef={inputRef}
                    allowAttachments
                    files={files}
                    setFiles={setFiles}
                    includeYouTube={includeYouTube}
                    onToggleYouTube={(next) => setIncludeYouTube(next)}
                    includeImageSearch={includeImageSearch}
                    onToggleImageSearch={(next) => setIncludeImageSearch(next)}
                  />
                </div>
              )}
            </ChatForm>
          </div>
        </div>

        <FeedbackDialog
          open={isFeedbackOpen}
          onOpenChange={setIsFeedbackOpen}
          conversationId={currentConversationId}
          userEmail={displayEmail}
          userId={user ? user.email : null}
        />
      </div>
    </>
  )
}
