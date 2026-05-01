# TASK_DISCIPLINE — Reglas de Disciplina de Tareas (CBI ECO AI)

> **Regla de oro:** Cada vez que detectes algo durante el desarrollo (bug, gap, mejora, idea, decisión pendiente, deuda técnica, hallazgo de auditoría), **primero lo subes como tarea al centro de tareas (`/tasks` → tabla `project_tasks`) y después continúas con tu trabajo**. Sin excepciones.

Este documento es **lectura obligatoria al inicio de cada sesión**. No se guarda como "memoria privada del agente" — vive aquí, versionado en git, visible para todo el equipo.

---

## 1. Por qué existe esta regla

- El SaaS lo construye un solo agente (Claude). Si no se traslada el conocimiento al sistema, se pierde al cerrar sesión.
- Marco quiere ver de un vistazo, en `/tasks`, qué falta y en qué fase está cada cosa. Como un sprint board real.
- Los hallazgos en mitad de un trabajo no pueden quedarse "en la conversación" — la conversación se pierde.

---

## 2. Cuándo subir una tarea (gatillos obligatorios)

Antes de seguir con lo que estés haciendo, sube tarea si:

| Situación | Acción |
|---|---|
| Encuentras un bug que no es lo que estás arreglando ahora mismo | Tarea nueva |
| Una sección no funciona como debería para algún rol | Tarea nueva con rol afectado |
| Falta una feature evidente (botón ausente, flujo incompleto) | Tarea nueva |
| Hay deuda técnica visible (código duplicado, sin tipos, sin tests) | Tarea nueva |
| Marco menciona algo de pasada que no es la tarea actual | Tarea nueva |
| Una integración externa (Resend, IG, TikTok…) requiere acción de Marco | Tarea nueva con descripción de qué necesitas de él |
| Detectas que algo "ya estaba hecho" pero no se había marcado completo | Marcar complete con evidencia |
| Encuentras una mejora UX/mobile-first | Tarea nueva |

---

## 3. Formato obligatorio de cada tarea

```
title:        Verbo + objeto claro (60 chars max). Ej: "Verificar push iOS con iPhone real"
description:  ¿Qué hay que hacer? + ¿Qué se necesita? + ¿Quién bloquea?
              Si es algo que descubriste auditando, incluir "✗ ENCONTRADO en auditoría YYYY-MM-DD"
              Si depende de Marco (API key, decisión, acceso) → línea separada "⚠ BLOQUEADO POR: <qué>"
category:     auth | properties | sooprema | training | social | dashboard | infra | content | external | testing | mobile | legal | integrations
status:       next_action (default) | waiting (depende de externo) | someday | complete
priority:     null o 'medium' (NO usar high/urgent/low — Marco quiere sin ranking por prioridad)
position:     número entero, menor = antes en la lista. Reservar fases:
                1-50    → activo, ordenado por fase de ship
                100-199 → completas
```

---

## 4. Cómo subir tareas (3 vías, en orden de preferencia)

### A) Vía REST API directa (cuando MCP de Supabase no está disponible)
```bash
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2)
curl -X POST "$URL/rest/v1/project_tasks" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"title":"...","description":"...","category":"...","status":"next_action","priority":"medium","position":<int>}'
```

### B) Vía MCP de Supabase (cuando esté conectado)
```sql
INSERT INTO project_tasks (title, description, category, status, priority, position)
VALUES ('...', '...', '...', 'next_action', 'medium', <int>);
```

### C) Vía script en `/tmp/` cuando son varias tareas a la vez
Crear `.py` con la lista, una llamada por tarea.

---

## 5. Cuándo marcar tareas completadas

Solo cuando:

- El código está pusheado a `main` y Vercel ha desplegado **Y**
- Hay evidencia real de que funciona (test E2E, screenshot, query de BD que confirma persistencia, log que confirma ejecución)
- Está actualizada la `description` con el resumen del fix:

```
description = description antigua + "\n\n✓ VERIFICADO YYYY-MM-DD: <evidencia concreta>"
```

**Nunca marcar complete porque "creo que está hecho".** La regla de "Nunca asumir" es absoluta.

---

## 6. Recordatorio para mí (Claude)

Antes de cada respuesta importante, revisa mentalmente:

- [ ] ¿He detectado algo nuevo en este turno que no esté ya en `/tasks`?
- [ ] Si sí → ¿lo he subido como tarea?
- [ ] ¿He marcado como `complete` algo que verifiqué que funciona?

Si no he hecho una de las dos, lo hago **antes** de continuar con la respuesta al usuario.

---

## 7. Política con tareas que no entiendo

Si Marco menciona algo y no estoy 100% seguro de qué quiere → subo la tarea con descripción honesta:

```
description: "Marco mencionó X el YYYY-MM-DD. Necesita aclaración: <pregunta concreta>."
status: 'waiting'
```

Mejor tener una tarea "pendiente de aclarar" que perder el dato.

---

## 8. Una vez al día (o al cierre de sesión grande)

- Verificar que las tareas en `complete` tienen evidencia.
- Verificar que no hay tareas duplicadas (mismo objetivo escrito distinto).
- Si el orden de fases necesita ajuste (porque cambia la prioridad real), reordenar `position`.

---

*Última revisión: 2026-04-22 — Marco pidió este protocolo cuando vio que se le perdían cosas entre sesiones.*
