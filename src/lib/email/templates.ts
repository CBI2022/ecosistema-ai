// Templates de email transaccional CBI — HTML inline para máxima compatibilidad
// con Gmail/Outlook/iOS Mail. Estilo dark + dorado, mobile-first.

import { getSiteUrl } from '@/lib/site-url'

const SITE_URL = getSiteUrl()
const LOGO_URL = `${SITE_URL}/logo-cbi.png`

function shell({ title, preheader, body }: { title: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F5F0E8;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#131313;border:1px solid rgba(201,168,76,0.15);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <img src="${LOGO_URL}" alt="Costa Blanca Investments" height="28" style="display:block;height:28px;border:0;"/>
              </td>
            </tr>
            <tr><td style="padding:28px;">${body}</td></tr>
            <tr>
              <td style="padding:20px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;line-height:1.6;color:#6A6070;">
                Costa Blanca Investments · Plataforma interna<br>
                Si recibes este email por error, ignóralo. No respondas a este mensaje.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#C9A84C;"><a href="${href}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#0A0A0A;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;">${label}</a></td></tr></table>`

const heading = (text: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#F5F0E8;line-height:1.3;">${text}</h1>`

const paragraph = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#9A9080;">${text}</p>`

// ============ TEMPLATES ============

export function forgotPasswordEmail(resetLink: string) {
  return {
    subject: 'Restablecer tu contraseña — CBI Performance Dashboard',
    html: shell({
      title: 'Restablecer contraseña',
      preheader: 'Recibimos tu solicitud para restablecer la contraseña.',
      body: `
        ${heading('Restablece tu contraseña')}
        ${paragraph('Recibimos una solicitud para cambiar la contraseña de tu cuenta CBI. Si fuiste tú, pulsa el botón de abajo. Caduca en 1 hora.')}
        <div style="margin:24px 0;">${button(resetLink, 'Cambiar contraseña')}</div>
        ${paragraph(`Si el botón no funciona, copia y pega esta URL: <span style="color:#C9A84C;word-break:break-all;">${resetLink}</span>`)}
        ${paragraph('Si no fuiste tú, ignora este email — tu contraseña sigue intacta.')}
      `,
    }),
  }
}

export function signupApprovedEmail(name: string, loginUrl: string) {
  return {
    subject: 'Tu acceso a CBI ha sido aprobado',
    html: shell({
      title: 'Acceso aprobado',
      preheader: `${name}, ya puedes entrar a la plataforma.`,
      body: `
        ${heading(`Bienvenido, ${name} 👋`)}
        ${paragraph('Tu solicitud de acceso a la plataforma interna de Costa Blanca Investments ha sido aprobada por un administrador.')}
        ${paragraph('Ya puedes iniciar sesión con el email y contraseña que registraste.')}
        <div style="margin:24px 0;">${button(loginUrl, 'Acceder al dashboard')}</div>
      `,
    }),
  }
}

export function signupRejectedEmail(name: string) {
  return {
    subject: 'Solicitud de acceso a CBI',
    html: shell({
      title: 'Solicitud de acceso',
      preheader: 'Sobre tu solicitud de acceso a CBI.',
      body: `
        ${heading(`Hola ${name}`)}
        ${paragraph('Hemos revisado tu solicitud de acceso a la plataforma interna de Costa Blanca Investments y, por el momento, no se ha aprobado.')}
        ${paragraph('Si crees que ha sido un error, contacta directamente con Bruno o Darcy.')}
      `,
    }),
  }
}

export function soopremaDoneEmail(reference: string, soopremaUrl: string) {
  return {
    subject: `📝 Borrador de ${reference} listo en Sooprema`,
    html: shell({
      title: 'Borrador en Sooprema',
      preheader: `${reference} está como borrador esperando a la secretaria.`,
      body: `
        ${heading('Borrador creado en Sooprema')}
        ${paragraph(`La propiedad <strong style="color:#F5F0E8;">${reference}</strong> se ha subido a Sooprema con los datos básicos. Está como borrador en "propiedades ocultas".`)}
        ${paragraph(`La secretaria entrará a Sooprema, completará ubicación, fotos y traducciones, y publicará la ficha definitiva.`)}
        <div style="margin:24px 0;">${button(soopremaUrl, 'Ver borrador en Sooprema')}</div>
      `,
    }),
  }
}

export function soopremaErrorEmail(reference: string, errorMsg: string, retryUrl: string) {
  return {
    subject: `⚠ Error publicando ${reference} en Sooprema`,
    html: shell({
      title: 'Error en publicación',
      preheader: `Hubo un error con ${reference}.`,
      body: `
        ${heading('Error al publicar en Sooprema')}
        ${paragraph(`No hemos podido subir la propiedad <strong style="color:#F5F0E8;">${reference}</strong>:`)}
        <pre style="margin:0 0 16px;padding:14px;background:#0A0A0A;border:1px solid rgba(255,80,80,0.2);border-radius:10px;color:#F87171;font-size:12px;overflow-x:auto;">${errorMsg}</pre>
        <div style="margin:24px 0;">${button(retryUrl, 'Reintentar')}</div>
      `,
    }),
  }
}

export function taskAssignedEmail(taskTitle: string, assignerName: string, taskUrl: string) {
  return {
    subject: `Nueva tarea asignada: ${taskTitle}`,
    html: shell({
      title: 'Tarea asignada',
      preheader: `${assignerName} te asignó una tarea.`,
      body: `
        ${heading('Tienes una nueva tarea')}
        ${paragraph(`<strong style="color:#F5F0E8;">${assignerName}</strong> te ha asignado:`)}
        <p style="margin:0 0 24px;padding:14px 18px;background:#0A0A0A;border-left:3px solid #C9A84C;border-radius:8px;font-size:15px;color:#F5F0E8;">${taskTitle}</p>
        <div style="margin:24px 0;">${button(taskUrl, 'Ver tarea')}</div>
      `,
    }),
  }
}

// ============ SHOOTS — Sesiones fotográficas con Jelle ============

interface ShootInfo {
  agentName: string
  address: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  notes?: string | null
}

function formatShootDateES(iso: string): string {
  // Acepta YYYY-MM-DD; añade T00:00:00 para evitar shift por timezone
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function shootBlock(info: ShootInfo): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#0A0A0A;border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;">📍 Propiedad</p>
        <p style="margin:0 0 14px;font-size:15px;color:#F5F0E8;font-weight:600;">${info.address}</p>
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;">📅 Cuándo</p>
        <p style="margin:0 0 14px;font-size:15px;color:#F5F0E8;">${formatShootDateES(info.date)} · <strong>${info.time}</strong></p>
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;">👤 Agente</p>
        <p style="margin:0 0 ${info.notes ? '14px' : '0'};font-size:15px;color:#F5F0E8;">${info.agentName}</p>
        ${info.notes ? `
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;">📝 Notas</p>
          <p style="margin:0;font-size:14px;color:#9A9080;line-height:1.6;">${info.notes}</p>
        ` : ''}
      </td></tr>
    </table>
  `
}

// Para Jelle: nuevo shoot solicitado
export function shootRequestedToPhotographerEmail(info: ShootInfo, dashboardUrl: string) {
  return {
    subject: `📸 Nueva solicitud de shoot · ${info.address}`,
    html: shell({
      title: 'Nueva solicitud de shoot',
      preheader: `${info.agentName} te ha pedido un shoot el ${info.date} a las ${info.time}.`,
      body: `
        ${heading('Nueva solicitud de sesión')}
        ${paragraph(`<strong style="color:#F5F0E8;">${info.agentName}</strong> te ha solicitado una sesión fotográfica. Confirma, reprograma o rechaza desde tu calendario.`)}
        ${shootBlock(info)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Abrir mi calendario')}</div>
      `,
    }),
  }
}

// Para el agente: tu solicitud está pendiente
export function shootRequestedToAgentEmail(info: ShootInfo, dashboardUrl: string) {
  return {
    subject: `📸 Solicitud enviada · ${info.address}`,
    html: shell({
      title: 'Solicitud de shoot enviada',
      preheader: `Esperando confirmación de Jelle para el ${info.date} a las ${info.time}.`,
      body: `
        ${heading('Solicitud enviada a Jelle')}
        ${paragraph('Hemos enviado tu petición a Jelle. Te avisaremos en cuanto la confirme o proponga otra hora.')}
        ${shootBlock(info)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Ver mi shoot')}</div>
      `,
    }),
  }
}

// Para el agente: Jelle confirmó
export function shootConfirmedToAgentEmail(info: ShootInfo, dashboardUrl: string) {
  return {
    subject: `✅ Jelle confirmó tu shoot · ${info.address}`,
    html: shell({
      title: 'Shoot confirmado',
      preheader: `${info.date} a las ${info.time} — confirmado por Jelle.`,
      body: `
        ${heading('¡Confirmado!')}
        ${paragraph('Jelle estará allí para hacer las fotos. Anótalo en tu agenda.')}
        ${shootBlock(info)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Ver mi shoot')}</div>
      `,
    }),
  }
}

// Para el agente: Jelle reprogramó
export function shootRescheduledToAgentEmail(
  oldInfo: ShootInfo,
  newInfo: ShootInfo,
  dashboardUrl: string,
) {
  return {
    subject: `🔄 Jelle reprogramó tu shoot · ${oldInfo.address}`,
    html: shell({
      title: 'Shoot reprogramado',
      preheader: `Nueva fecha: ${newInfo.date} a las ${newInfo.time}.`,
      body: `
        ${heading('Jelle propone otra fecha')}
        ${paragraph(`Tu shoot del <strong style="color:#F5F0E8;">${formatShootDateES(oldInfo.date)} a las ${oldInfo.time}</strong> ha sido movido. Nueva propuesta:`)}
        ${shootBlock(newInfo)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Ver mi shoot')}</div>
      `,
    }),
  }
}

// Para el agente: Jelle rechazó
export function shootRejectedToAgentEmail(info: ShootInfo, dashboardUrl: string, reason?: string | null) {
  return {
    subject: `❌ Jelle no puede ese día · ${info.address}`,
    html: shell({
      title: 'Shoot no disponible',
      preheader: 'Reserva otra fecha desde el dashboard.',
      body: `
        ${heading('Esa fecha no le va')}
        ${paragraph(`Jelle no puede atender la sesión que pediste para el <strong style="color:#F5F0E8;">${formatShootDateES(info.date)} a las ${info.time}</strong> en ${info.address}.`)}
        ${reason ? paragraph(`<em style="color:#F5F0E8;">"${reason}"</em>`) : ''}
        ${paragraph('Reserva otra fecha desde tu dashboard cuando quieras.')}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Reservar otra fecha')}</div>
      `,
    }),
  }
}

// Para el agente: shoot completado, fotos en camino
export function shootCompletedToAgentEmail(info: ShootInfo, dashboardUrl: string) {
  return {
    subject: `📷 Shoot completado · ${info.address}`,
    html: shell({
      title: 'Shoot completado',
      preheader: 'Tus fotos están en proceso de edición.',
      body: `
        ${heading('Shoot completado')}
        ${paragraph('Jelle ha terminado la sesión. Las fotos están en proceso de edición y aparecerán pronto en tu galería.')}
        ${shootBlock(info)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Ver mis fotos')}</div>
      `,
    }),
  }
}

// Recordatorio 24h antes — versión genérica para ambos lados
export function shootReminderEmail(info: ShootInfo, recipientRole: 'agent' | 'photographer', dashboardUrl: string) {
  const isJelle = recipientRole === 'photographer'
  return {
    subject: `⏰ Recordatorio: shoot mañana · ${info.address}`,
    html: shell({
      title: 'Recordatorio de shoot',
      preheader: `Mañana ${info.time} en ${info.address}.`,
      body: `
        ${heading('Recordatorio: shoot mañana')}
        ${paragraph(isJelle
          ? 'Recuerda tu sesión fotográfica de mañana. Aquí los detalles:'
          : 'Tu sesión fotográfica con Jelle es mañana. Aquí los detalles:')}
        ${shootBlock(info)}
        <div style="margin:24px 0;">${button(dashboardUrl, 'Abrir dashboard')}</div>
      `,
    }),
  }
}
