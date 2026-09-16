import { supabase } from '../supabase/client';
import { subscribeToProducts, subscribeToSyncLogs, logSyncAction } from '../supabase/realtime';

/**
 * Sincronizza i prodotti tra operatori collegati allo stesso account
 */
export class OperatorSync {
  private operatorId: string;
  private productsChannel: any = null;
  private syncChannel: any = null;

  constructor(operatorId: string) {
    this.operatorId = operatorId;
  }

  /**
   * Avvia la sincronizzazione real-time
   */
  startSync(callbacks: {
    onProductChange?: (change: any) => void;
    onSyncLog?: (log: any) => void;
  }) {
    // Sottoscrivi ai cambiamenti dei prodotti
    if (callbacks.onProductChange) {
      this.productsChannel = subscribeToProducts(this.operatorId, callbacks.onProductChange);
    }

    // Sottoscrivi ai log di sincronizzazione
    if (callbacks.onSyncLog) {
      this.syncChannel = subscribeToSyncLogs(this.operatorId, callbacks.onSyncLog);
    }
  }

  /**
   * Ferma la sincronizzazione
   */
  stopSync() {
    if (this.productsChannel) {
      supabase.removeChannel(this.productsChannel);
    }
    if (this.syncChannel) {
      supabase.removeChannel(this.syncChannel);
    }
  }

  /**
   * Registra un'azione (es. prodotto creato/modificato)
   */
  async logAction(action: string, data?: any) {
    await logSyncAction(this.operatorId, action, data);
  }

  /**
   * Ottieni tutti gli operatori collegati allo stesso account
   */
  async getLinkedOperators() {
    const { data } = await supabase
      .from('operators')
      .select('*, users(*)')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    return data || [];
  }
}

export default OperatorSync;
