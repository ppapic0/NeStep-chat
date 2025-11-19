const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Search } from 'lucide-react'

type Msg = {
  id: string
  who: 'user' | 'bot'
  text: string
  offer?: boolean     // 웹검색 제안 말풍선 여부
}

const theme = {
  bg: '#fafaf5',
  card: '#ffffff',
  border: '#e7e2cf',
  shadow: '0 10px 30px rgba(0,0,0,.06)',

  bubbleUser: '#bfe7c2',   // 연초록
  bubbleBot:  '#fff4bd',   // 연노랑

  text: '#423528',
  textSoft: '#7a6a56',
  accentBrown: '#5b4636',

  btn: '#7dbb74',
  btnBorder: '#4b6b43',
  btnText: '#ffffff',

  suggestBg: '#fde68a',
  suggestBorder: '#d6b656'
}

export default function App() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'welcome', who: 'bot', text: '안녕하세요! 🌿 NeStep 챗봇입니다. 무엇을 도와드릴까요?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastQuestion, setLastQuestion] = useState<string>('') // 버튼 눌렀을 때 다시 보낼 질문 저장
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // 공통 전송 함수
  const send = async (question: string, useWeb = false) => {
    if (!question || loading) return

    const typingId = crypto.randomUUID()

    // 사용자 메시지 추가 (웹검색 보완 클릭 시엔 사용자 말풍선은 추가 X)
    if (!useWeb) {
      setMsgs(prev => [...prev, { id: crypto.randomUUID(), who: 'user', text: question }])
    }
    setLoading(true)
    setMsgs(prev => [...prev, { id: typingId, who: 'bot', text: useWeb ? '웹 검색으로 보완 중…' : '답변 작성 중…' }])

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, useWeb })
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${txt}`)
      }
      const data = await res.json()

      // 모델 답변으로 타이핑 말풍선 교체
      setMsgs(prev => prev.map(m => m.id === typingId ? { ...m, text: data.reply } : m))

      // 1차(문서 기반) 답변 이후에만 웹검색 제안 말풍선 추가
      if (!useWeb) {
        setLastQuestion(question)
        setMsgs(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            who: 'bot',
            text: '필요하면 🔎 최신 웹 검색으로 보완해 드릴까요?',
            offer: true
          }
        ])
      }
    } catch (e: any) {
      setMsgs(prev => prev.map(m => m.id === typingId ? { ...m, text: `오류: ${e?.message || e}` } : m))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // 입력창에서 보내기
  const onSend = () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    send(q, false)
  }

  // 제안 버튼 클릭 → 같은 질문으로 useWeb=true 전송
  const onWebEnhance = () => {
    if (!lastQuestion) return
    send(lastQuestion, true)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: `linear-gradient(180deg, ${theme.bg} 0%, #fff 60%, ${theme.bg} 100%)`,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      color: theme.text
    }}>
      {/* 상단 헤더 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: `linear-gradient(180deg, #eef6ec 0%, ${theme.bg} 100%)`,
        borderBottom: `1px solid ${theme.border}`,
        backdropFilter: 'blur(6px)'
      }}>
        <div style={{
          maxWidth: 860, margin: '0 auto', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${theme.border}`,
            display: 'grid', placeItems: 'center', background: '#e9f7ec',
            boxShadow: '0 2px 8px rgba(0,0,0,.06)'
          }}>🌱</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: theme.accentBrown }}>
            NeStep 챗봇
          </h1>
          <span style={{
            marginLeft: 'auto', fontSize: 12, color: theme.textSoft,
            background: '#fff7cc', border: `1px solid ${theme.border}`,
            padding: '4px 10px', borderRadius: 999
          }}>
            둥지처럼 따뜻한 자립 도우미
          </span>
        </div>
      </header>

      {/* 카드 컨테이너 */}
      <main style={{ maxWidth: 860, margin: '20px auto', padding: '0 20px' }}>
        <div style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 16, background: theme.card, boxShadow: theme.shadow,
          overflow: 'hidden'
        }}>
          {/* 채팅 영역 */}
          <div style={{ padding: 16, maxHeight: '65dvh', minHeight: 380, overflowY: 'auto' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 10, margin: '10px 0', alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, border: `1px solid ${theme.border}`,
                  display: 'grid', placeItems: 'center',
                  background: m.who === 'user' ? '#e9f7ec' : '#fff8d9',
                  flex: '0 0 28px'
                }}>
                  {m.who === 'user' ? <User size={16} color="#355b2f" /> : <Bot size={16} color="#8a6a39" />}
                </div>

                <div style={{
                  maxWidth: '75%',
                  background: m.who === 'user' ? theme.bubbleUser : theme.bubbleBot,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16, padding: '10px 14px',
                  whiteSpace: 'pre-wrap', lineHeight: 1.55,
                  boxShadow: '0 2px 6px rgba(0,0,0,.04)'
                }}>
                  {m.text}

                  {/* 웹검색 제안 버튼 말풍선 */}
                  {m.offer && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={onWebEnhance}
                        style={{
                          background: theme.suggestBg,
                          border: `1px solid ${theme.suggestBorder}`,
                          borderRadius: 10, padding: '8px 12px',
                          fontSize: 13, color: theme.accentBrown,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,.06)'
                        }}
                        title="최신 정보로 보완"
                      >
                        <Search size={14} /> 최신 웹 검색으로 보완하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div style={{
            position: 'sticky', bottom: 0,
            borderTop: `1px solid ${theme.border}`,
            background: `linear-gradient(180deg, ${theme.card} 0%, ${theme.bg} 100%)`,
            padding: 12
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSend() }}
                placeholder="메시지를 입력하세요 (예: 최신 자립지원제도 알려줘)"
                style={{
                  flex: 1, 
                  height: 44, 
                  padding: '0 14px',
                  borderRadius: 12, 
                  border: `1px solid ${theme.border}`,
                  background: '#fffdf7', 
                  outline: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(0,0,0,.02)',
                  color: '#000',
                  caretColor: '#000',
                }}
              />
              <button
                onClick={onSend}
                disabled={loading || !input.trim()}
                style={{
                  height: 44, padding: '0 16px',
                  borderRadius: 12,
                  border: `1px solid ${theme.btnBorder}`,
                  background: theme.btn, color: theme.btnText,
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 6px 16px rgba(0,0,0,.15)',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? .7 : 1,
                  transition: 'transform .06s ease'
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Send size={16} /> 보내기
              </button>
            </div>
            <div style={{ fontSize: 12, color: theme.textSoft, marginTop: 8 }}>
              먼저는 문서 기반으로 답하고, 필요하면 <b>“최신 웹 검색으로 보완하기”</b> 버튼으로 최신 정보도 확인할 수 있어요.
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '10px 0 24px', color: theme.textSoft, fontSize: 12 }}>
        © {new Date().getFullYear()} NeStep · Warm Nest Theme
      </footer>
    </div>
  )
}
