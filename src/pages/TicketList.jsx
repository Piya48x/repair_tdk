import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TicketList({ user }) {
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    setTickets(data || [])
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">รายการแจ้งซ่อม</h2>

      {tickets.map(t => (
        <div key={t.id} className="bg-white p-4 mb-2 rounded shadow">
          <div className="flex justify-between">
            <span className="font-semibold">{t.category}</span>
            <span className="text-sm">{t.status}</span>
          </div>
          <div className="text-sm text-gray-600">
            {t.priority} • {new Date(t.created_at).toLocaleString()}
          </div>
          <div className="mt-1">{t.description}</div>
        </div>
      ))}
    </div>
  )
}
