import { supabase } from '../lib/supabaseClient'

export async function updateTicketStatus(ticketId, status, userId, note = '') {
  await supabase.from('tickets')
    .update({ status })
    .eq('id', ticketId)

  await supabase.from('ticket_logs').insert({
    ticket_id: ticketId,
    action: status,
    note,
    created_by: userId
  })
}
