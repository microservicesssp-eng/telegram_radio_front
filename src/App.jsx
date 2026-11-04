import { useEffect, useRef, useState } from 'react'
import './App.css'

// || вместо ?? — чтобы пустая строка в .env не давала API=''
// replace — чтобы trailing slash в .env не давал //api/messages
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export default function App() {

  const [text, setText] = useState('')
  const [log, setLog] = useState([])
  const [sendError, setSendError] = useState('')   // всегда строка
  const [offline, setOffline] = useState(false)
  const lastId = useRef(Number(localStorage.getItem('lastId') ?? 0))

  useEffect(() => {

    let stop = false

    async function poll() {
      try {
        const res = await fetch(`${API}/api/messages?after=${lastId.current}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const items = await res.json()
        if (stop) return
        setOffline(false)
        if (items.length > 0) {
          lastId.current = items[items.length - 1].id
          localStorage.setItem('lastId', lastId.current)
          setLog((prev) => [
            ...prev,
            ...items.map((m) => ({
              key: `in-${m.id}`,
              dir: 'in',
              from: m.from,
              text: m.text,
            })),
          ])
        }
      } catch (err) {
        if (!stop) {
          console.error('poll failed:', err)
          setOffline(true)
        }
      }
    }

    poll()
    const timer = setInterval(poll, 2000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [])

  async function send(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return

    try {
      const res = await fetch(`${API}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
        body: value,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
      setLog((prev) => [
        ...prev,
        { key: `out-${Date.now()}`, dir: 'out', text: value },
      ])
      setText('')
      setSendError('')
    } catch (err) {
      setSendError(err.message)
    }
  }

  return (
    <div className="radio">
      <h1>📻 Telegram Radio</h1>
      <p className="hint">
        Строка отправляется в Telegram-бота, а сообщения боту появляются здесь
        (и в консоли Spring Boot).
      </p>

      {offline && (
        <div className="alert">Нет связи с сервером Spring Boot</div>
      )}

      <div className="log">
        {log.length === 0 && <div className="empty">Сообщений пока нет</div>}
        {log.map((m) => (
          <div key={m.key} className={`msg msg--${m.dir}`}>
            {m.dir === 'in' && <strong>{m.from}:</strong>}
            {m.text}
          </div>
        ))}
      </div>

      <form className="form" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите строку для Telegram..."
        />
        <button type="submit">Отправить</button>
      </form>

      {sendError && <div className="alert">{sendError}</div>}
    </div>
  )
}