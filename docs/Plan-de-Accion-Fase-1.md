# Plan de Acción — Fase 1 CBI

> Para revisión y aprobación de Darcy y Bruno.

---

## 1. La app del agente

Al entrar, el agente ve **una sola pantalla: subir una propiedad**.

- Rellena el formulario con los datos de la propiedad.
- Pulsa **"Enviar propiedad"**.
- Recibe un mensaje de confirmación de que se envió.

No tiene menús ni más secciones. Solo eso.

---

## 2. La oficina (Chloe)

Cuando un agente envía una propiedad:

- A Chloe le llega una **notificación dentro de la app**.
- La propiedad aparece en su **bandeja de pendientes**.
- Chloe la abre y ve **toda la información ordenada y lista para copiar**.
- La pasa a Sooprema.
- Al terminar, marca la propiedad como **"publicada"** y desaparece de sus pendientes.

Todo dentro de la app. No usa Google Drive ni correos.

---

## 3. La vista de administrador (nosotros)

Al abrir el dashboard, los administradores vemos **lo mismo que ve todo el mundo**:
la pantalla de subir propiedad.

Además, solo los administradores tenemos **dos botones**:

- **Admin** (el que ya existe): Knowledge, Tareas, Equipo, CRM y Sooprema.
- **Opciones antiguas** (nuevo): acceso a todas las secciones actuales que todavía
  no rediseñamos — propiedades, valoración, contratos, facturas, etc.

Los agentes **no** ven estos botones. Son exclusivos de los administradores.

---

## 4. Cada propiedad tiene un estado

- **Enviada**: el agente la mandó y está pendiente de que Chloe la pase a Sooprema.
- **Publicada**: Chloe ya la subió a Sooprema.

Esto permite que Chloe sepa siempre qué tiene pendiente y qué ya está hecho.

---

## 5. Orden en que se construye

1. Estado de cada propiedad: "enviada" / "publicada".
2. Botón **"Enviar propiedad"** que avisa a Chloe.
3. **Bandeja de Chloe** con la información lista para copiar a Sooprema.
4. App del agente reducida a la pantalla de subir propiedad.
5. Vista de administrador con los dos botones (**Admin** + **Opciones antiguas**).
6. Prueba completa de principio a fin.

---

## 6. Importante

- Ninguna sección actual se borra: las que no se ven se **ocultan** y quedan accesibles
  para los administradores en **"Opciones antiguas"**.
- Los administradores conservan acceso total a todo en todo momento.
