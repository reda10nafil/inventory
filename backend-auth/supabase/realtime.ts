import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Sottoscrivi ai cambiamenti in tempo reale dei prodotti
 * Utile per sincronizzare più operatori sullo stesso account
 */
export function subscribeToProducts(
  operatorId: string,
  callback: (change: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: any;
    old: any;
  }) => void
): RealtimeChannel {
  return supabase
    .channel(`products:${operatorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `operator_id=eq.${operatorId}`
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old
        });
      }
    )
    .subscribe();
}

/**
 * Sottoscrivi ai log di sincronizzazione
 * Per comunicare tra operatori collegati allo stesso account
 */
export function subscribeToSyncLogs(
  operatorId: string,
  callback: (log: any) => void
): RealtimeChannel {
  return supabase
    .channel(`sync:${operatorId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_logs',
        filter: `operator_id=eq.${operatorId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

/**
 * Registra un'azione di sincronizzazione
 */
export async function logSyncAction(
  operatorId: string,
  action: string,
  data?: any
) {
  const { error } = await supabase
    .from('sync_logs')
    .insert({
      operator_id: operatorId,
      action,
      data: data || {}
    });

  if (error) {
    console.error('Error logging sync action:', error);
    throw error;
  }
}

export default { subscribeToProducts, subscribeToSyncLogs, logSyncAction };
