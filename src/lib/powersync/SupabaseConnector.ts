import { PowerSyncBackendConnector, CrudEntry } from '@powersync/web';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async fetchCredentials() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error || !session) {
      throw new Error('Not authenticated');
    }

    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
    };
  }

  async uploadData(db: any): Promise<void> {
    const batches = await db.getModifiedBatches();
    for (const batch of batches) {
      for (const op of batch.operations) {
        const table = op.table;
        const row = op.data;

        try {
          if (op.op === 'PUT' || op.op === 'PATCH') {
            // Append-Only tables: always insert
            if (['visits', 'investigations'].includes(table)) {
              await this.supabase.from(table).insert({ ...row, id: op.id });
            } else {
              // Master tables: Last Write Wins (Upsert)
              await this.supabase.from(table).upsert({ ...row, id: op.id });
            }
          } else if (op.op === 'DELETE') {
            // Deletions are allowed as per the 24h window logic (handled in UI)
            await this.supabase.from(table).delete().eq('id', op.id);
          }
        } catch (e) {
          console.error(`Failed sync op ${op.op} for ${table}/${op.id}`, e);
        }
      }
      await batch.markAsSynced();
    }
  }
}
