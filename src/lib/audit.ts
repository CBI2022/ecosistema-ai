import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  | 'property.create'
  | 'property.update'
  | 'property.delete'
  | 'property.publish'
  | 'sale.create'
  | 'sale.update'
  | 'sale.delete'
  | 'sooprema.run'
  | 'sooprema.retry'
  | 'sooprema.cancel'
  | 'profile.approve'
  | 'profile.reject'
  | 'profile.role_change'
  | 'profile.delete'
  | 'auth.login'
  | 'auth.logout'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'fub.syncFromZero.start'
  | 'fub.syncFromZero.done'
  | 'fub.webhooks.subscribe'
  | 'fub.webhooks.unsubscribe'
  | 'fub.webhook.received'
  | 'fub.linkProfiles'
  | 'fub.updateMapping'
  | 'fub.reconcile'

interface AuditEntry {
  actor_id: string | null
  actor_email?: string | null
  actor_role?: string | null
  action: AuditAction
  entity_type?: string
  entity_id?: string | null
  metadata?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
}

// Registra un evento de auditoría. Nunca lanza excepción — si falla, solo loguea en consola.
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      actor_id: entry.actor_id,
      actor_email: entry.actor_email ?? null,
      actor_role: entry.actor_role ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
    })
  } catch (err) {
    console.error('[audit] failed to log entry:', err, entry)
  }
}
