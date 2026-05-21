# Especificación — Subida de propiedad a Sooprema

> Fuente de verdad consolidada. Construida desde: (1) llamada Chloe×Marco 2026-05-12, (2) instrucciones de Marco 2026-05-20, (3) las 16 capturas reales de Sooprema en `Sooprema/Sooprema Capturas/`.
> Objetivo: que la automatización suba la propiedad COMPLETA (no solo la primera ventana).

---

## ⚡ ESTADO REAL EN PRODUCCIÓN (verificado en código tras sync 2026-05-20)

**Automation (`src/lib/sooprema/automation.ts`):**
- ✅ Login, abrir form, rellenar Ventana 1 (text/select/textarea por nombre), status tags, click "Continuar", capturar `external_id`.
- ✅ **Fotos desde Google Drive YA implementado** (best-effort): lista carpeta pública, descarga hasta 30 fotos (drones al final, `setInputFiles`). PERO **requiere `GOOGLE_DRIVE_API_KEY`** → hoy **NO está en `.env.local`** → las fotos fallan con "Falta GOOGLE_DRIVE_API_KEY".
- ❌ NO rellena Ventana 2: **ubicación, propietario, agente, textos de venta, portales/XML**. Solo avanza pasos a ciegas buscando el input de fotos.
- ❌ NO recorre `fields.checkbox` (equipment) — y los nombres del mapper (`has_pool`...) son NUESTROS, no los de Sooprema (TODO en `mapper.ts:244`).
- ❌ NO selecciona certificado energético. ❌ NO pulsa "Confirmar y salir".

**Pipeline de fotos (cableado real):** Jelle entrega → `deliverShootPhotos` guarda `photos_drive_link` en la propiedad → `properties.ts` lo lee del form → `sooprema.ts` lo pasa a la automation. Todo conectado. Solo falta la API key.

**Form (`PropertyForm.tsx`):** ya tiene el editor IA de título+descripción 7 idiomas (`TitleAndDescriptionEditor.tsx`) y prefill desde shoot. PERO sigue: sin pestañas, con Referencia/Promotion/Ocupación/Urbanization, calculadora con la fórmula vieja (bug comisión), sin Equipment/Features.

**Validación de la llamada:** Chloe confirmó que los datos de Ventana 1 SÍ subieron → los nombres text/select de Ventana 1 del mapper están mayormente bien. Lo que falló (dirección, owner, agente, textos, fotos) es todo Ventana 2 + equipment.

---

## 0. Cómo funciona Sooprema (arquitectura de 2 ventanas)

Cuando subes una propiedad en Sooprema hay **DOS ventanas**:

**VENTANA 1 — "General"** (`/admin/propiedades/add/`)
- Datos principales, tipos, tamaños, habitaciones, Equipment, Features, Community costs, XML Feed.
- Abajo botón azul grande **"Continuar"** → puede salir un **pop-up** → se le da **"Aceptar"**.

**VENTANA 2 — configuración final** (tras Continuar)
- Arriba a la derecha: selector **Oficina / Agente / Propietario**.
- Dirección.
- Textos de venta (título + descripción + distancias).
- Fotos y multimedia.
- Publicación en portales + Feeds XML.
- A la izquierda hay una pestaña **"General"** que devuelve a la Ventana 1.

**EL ERROR ACTUAL:** la automatización solo rellena la Ventana 1 y se detiene. Toda la Ventana 2 (dirección, agente, propietario, textos, fotos, portales) NO se sube. Ahí está el grueso del fallo.

**Flujo de aprobación:** al subir, la propiedad cae automáticamente en **"Propiedades ocultas"** (borrador nativo de Sooprema). Chloe entra, asigna referencia, revisa, ordena fotos y publica. El borrador NO lo gestionamos nosotros — es el de Sooprema.

---

## 1. Form del dashboard — reestructuración

### 1.1 Cambio de layout: de scroll largo → PESTAÑAS
El form hoy es un scroll largo. Pasar a **pestañas**, una por sección:
1. **Información General**
2. **Equipment**
3. **Features**
4. **Community costs** (siempre la última)
5. **Portales / XML**
(Dirección, Propietario, Descripción, Fotos: ver dónde encajan abajo.)

### 1.2 ELIMINAR del form (Marco, explícito)
- ❌ **Referencia** (el campo "auto si vacío"). La asigna SOLO Chloe dentro de Sooprema. El agente no la ve.
- ❌ **Tipo de operación** (venta/alquiler/obra nueva/parcela). Lo hace Chloe en Sooprema.
- ❌ Checks de **publicar inmediatamente / Promote / Highlights / First Position / Publishing Home**. Los hace Chloe.
- ❌ **Promotion Name**
- ❌ **Ocupación Vivienda**
- ❌ **Urbanization Name**

### 1.3 PESTAÑA 1 — Información General
Orden y obligatoriedad (asterisco rojo = obligatorio):
- **Precio** ← PRIMER campo, arriba del todo. **OBLIGATORIO***
- **Zona** **OBLIGATORIO***
- **Tipo de propiedad** **OBLIGATORIO*** (desplegable, ver §4.1)
- **Vistas** **OBLIGATORIO*** (desplegable, ver §4.2)
- **Built size / Construido (m²)** **OBLIGATORIO***
- **Plot size / Parcela (m²)** — NO obligatorio. Nota al lado: *"Si la propiedad no tiene parcela, escribe aquí lo mismo que en Construido"*.
- Useful (m²), Terrace size (m²), Superficie Jardín (m²) — opcionales
- Bedrooms, Bathrooms, Guest toilet, Lounge, Dining room — opcionales
- Kitchen (desplegable) — opcional
- Build year, Renovated in — opcionales (Renovated importante)

> Los campos que Marco NO nombró se mantienen igual.

### 1.4 PESTAÑA 2 — Equipment (NUEVA, no existía)
Captura: `Equipment.png`. Estructura exacta:
- **Desplegables** (4):
  - **Heating** → opciones en `Equipment-heating.png` (ver §4.3)
  - **Pool** → opciones en `Equipment-pool.png` (ver §4.4)
  - **Air Conditioning** → opciones en `Equipment-air conditioning.png` (ver §4.5)
  - **Furnitures type** → opciones en `Equipment-furnitures tipe.png` (ver §4.6)
- **Checkboxes** (el resto):
  Garage · Open Terrace · Covered terrace · Parking · Furnished · No amueblado · Fireplace · Sat / TV · Storage room · Water deposit · Barbecue · Lift · Summer kitchen · Telephone · Alarm system · Internet · Laundry room · Outdoor shower · Double glazing · Security door · Enclosed plot · Balcón · Jacuzzi

### 1.5 PESTAÑA 3 — Features (NUEVA, no existía)
Captura: `Features.png`. Estructura exacta:
- **Desplegables** (5):
  - **Orientation** → `Features-orientation.png` (ver §4.7)
  - **Terrain** → `Features-terrain.png` (ver §4.8)
  - **Floors** → desplegable numérico **1 al 50** (= nº total de plantas que tiene la propiedad)
  - **Floor nº** → `features-floor-n.png` (= planta en la que está ubicada; ver §4.9)
  - **Construction type** → ⚠ FALTA captura del desplegable (pedir a Marco o explorar en Sooprema)
- **Checkboxes** (de "Garden" a "Smoke vent"):
  Garden · Distribution diaphanous · Building homes use only · Concierge Service · Porter Service · Mixed building · Exterior · Interior · Good communications · Loading dock · Office · Smoke vent
- **Campos de texto** (lo demás):
  Warehouse heigth · Nightclubs · Water Sports · Supermarket · Restaurants · Theme parks · Water Parks · Distance to sea · Distance to market · Distance to services · Distance to town center · Diving · Golf · Bars · Nautical Club · Hospital

> Diferencia clave (Chloe lo dice en la llamada): **Floors** = cuántas plantas tiene la propiedad/edificio · **Floor nº** = en qué planta está ubicada.

### 1.6 PESTAÑA 4 — Community costs (última)
Como en Sooprema. Analizar la sección real y replicar:
- Gastos comunidad
- IBI
- Basura
(No obligatorios pero importantes en pisos.)

### 1.7 PESTAÑA 5 — Portales / XML
Replicar tal cual Sooprema. Hay 3 piezas:
- **Publicación en portales** (`Publicación en portales.png`) — desplegable multi-check: **Sooprema · Kyero · Idealista**
- **Feeds XML** (`Feeds XML.png`) — desplegable multi-check: **Class and villas · INMOLUK**
- **XML FEED** (`XML feed.png`) — sección con 3 checkboxes: *Add the feed system kyero · Add the feed system sooprema · Add the feed system idealista*

> ⚠ El "XML Feed" aparece en la Ventana 1 (General) Y también en la Ventana 2 (Portales y XMLs). La automatización debe asegurar que **ambos** quedan rellenados igual.

### 1.8 Guest Apartment → SE MANTIENE IGUAL
Check + si lo marcan, rellenan los mismos datos que hoy.

### 1.9 Certificado energético → SE MANTIENE IGUAL

### 1.10 Calculadora de precio → ARREGLAR FÓRMULA
Bug confirmado (llamada 28:00–29:15). Regla de Chloe: **"el precio de la web YA lleva nuestra comisión"**.
- Hoy (MAL): input = Price Owner → `salePrice = priceOwner + comisión` (infla el precio).
- Correcto: input = **Precio de venta (web)** → `comisión = salePrice × %` → `owner recibe = salePrice − comisión`.
- Ejemplo Chloe: venta 400.000€, 5% → comisión 20.000€ → owner recibe 380.000€.

### 1.11 Descripción → DAR CLARIDAD (hay 2 campos confusos)
Hoy hay dos campos de descripción y confunde. Dejar EXTREMADAMENTE claro qué es cada uno:
- **Campo 1 (agente):** descripción con sus propias palabras. NO se sube tal cual.
- **Campo 2 (generado IA):** el texto final que va a Sooprema. Se genera con: la descripción del agente + TODOS los datos rellenados de la propiedad.
- Estructura del texto final (llamada min 41): **título → mini-título en negrita → cuerpo → distancias al final** (Playa, Aeropuerto Alicante, Aeropuerto Valencia).
- Reglas anti-ChatGPT: sin guiones largos `—`, sin la palabra "Nestled".
- Idioma del output = idioma de la bandera elegida.
- ⏳ El framework/patrón de descripción lo enviará Marco DESPUÉS. Ahora basta con que genere y se suba bien. Más adelante: posible "skill" para aplicar siempre el estilo CBI.

### 1.12 Dirección → NO TOCAR (Marco: "está bien")

### 1.13 Propietario → ARREGLAR PERSISTENCIA (bug grave)
- Hoy: al crear un propietario, **el dashboard NO lo guarda** (no hay base de datos / memoria). En la llamada esto además borró todo el wizard.
- Arreglar: crear/usar tabla `owners` en Supabase (ref `cimcdjrptyullbvcumel`) para que el propietario quede guardado y reutilizable.
- En Sooprema (Ventana 2): el propietario se asigna en el selector "Propietario" (igual que el agente, §2).

---

## 2. Selector Oficina / Agente / Propietario (Ventana 2)
Captura: `selector oficina agente propietario.png`. Arriba a la derecha al editar.
- Por defecto cada uno está en **"Sin asignar"**.
- Para asignar: clicar la **X** de "Sin asignar" → se habilita el desplegable → escribir/seleccionar.
- **Agente:** automático. Si el agente "X" subió la propiedad, la automation busca "X" en el desplegable y lo selecciona (llamada ~min 35).
- **Propietario:** se crea primero en el dashboard (§1.13); luego en Sooprema se va al selector "Propietario", se quita "Sin asignar" y se selecciona el propietario ya creado → se guarda → se genera su ficha (a la izquierda se rellenan los demás datos que puso el agente).

---

## 3. Automatización — qué falta implementar (Playwright)

Hoy `src/lib/sooprema/automation.ts` solo hace login + Ventana 1 datos básicos + click Continuar. Falta:

**Ventana 1 (completar):**
- Recorrer Equipment (desplegables + checkboxes) — hoy `fields.checkbox` se ignora.
- Recorrer Features (desplegables + checkboxes + campos de texto).
- Community costs (IBI, Basura, Comunidad).
- XML Feed (3 checks).
- Certificado energético.

**Transición:** click "Continuar" → manejar pop-up → "Aceptar" → llegar a Ventana 2.

**Ventana 2 (todo nuevo):**
- Selector Agente (automático por quien subió) — `mapper.ts` ya da `soopremaAgentId`, hoy no se usa.
- Selector Propietario (crear/asignar).
- Dirección (calle, número con fallback si sale rojo, población, planta, puerta).
- Textos de venta (título + descripción + distancias).
- **Fotos** (ver §5).
- Publicación en portales + Feeds XML (asegurar que coinciden con Ventana 1).
- Botón final "Confirmar y salir" → guarda en Propiedades ocultas. ⚠ confirmar cuál es exactamente.

---

## 4. Listas exactas de los desplegables (de las capturas)

### 4.1 Type (`Información general-tipo.png`)
Apartment · Building · Bungalow · Commercial premises · Detached house · Duplex · Finca · Flat · Hotel · House · Office · Penthouse · Plot · Restaurant · Semi-detached house · Terraced house · Town house · Villa · (-) · Commercial building · Cortijo · Country house · Farmhouse · Garage · Industrial building · Industrial plot · Loft · Parking · Room · Shelter · Storage room · Study · terrain · Tower · Triplex · Warehouse · Work office

### 4.2 Views (`Información general-views.png`)
Community area · First line · Golf course · Good views · Green zone · National Park · Open · Others · Panoramas · Sea and mountains · Sports area · To the Castle · To the city · To the exterior · To the garden · To the mountain · To the park · To the sea · To the square · To the street · To the valley

### 4.3 Heating (`Equipment-heating.png`)
Storage heaters · Aerothermal energy · Biomass · Blue heat radiators · Centralised · Centralised fuel oil · Centralised gas · Central electric · Diesel Boiler · Duct-based · Electric · Electric marble plate · Electric underfloor heating · Fireplace · Firewood heater · Gas underfloor heating · Geothermal energy · Heater · Heat pumps · Hot/Cold · individual_city_gas · Natural Gas · Not available · Oil underfloor heating · Pellets · Pre-installation · Propane-Butane · Radiating floor · Solar panels · Split · underfloor heating heat pump · Yes

### 4.4 Pool (`Equipment-pool.png`)
Climatized · Community · Cover · Infinity · Inside · Not available · Pool with Jacuzzi · Private · Yes

### 4.5 Air Conditioning (`Equipment-air conditioning.png`)
Centralised · Cold · Duct-based · Hot/Cold · Not available · Pre-installation · Split · Yes

### 4.6 Furnitures type (`Equipment-furnitures tipe.png`)
Furnished · Furnished kitchen · Negotiable · Partially furnished · Unfurnished · Yes

### 4.7 Orientation (`Features-orientation.png`)
East · North · Northeast · Northwest · South · Southeast · Southwest · West

### 4.8 Terrain (`Features-terrain.png`)
Agricultural · Llano · Inclined · On slope · Rocky · Rustic · Semi inclined · Steeply inclined · Urban · Developable · Urbanized

### 4.9 Floor nº (`features-floor-n.png`)
Ground floor · Entresuelo · Top floor · 1ª Planta … hasta 50ª Planta

### 4.10 Floors
Numérico 1 a 50.

### 4.11 Construction type
⚠ FALTA captura del desplegable.

---

## 5. Fotos — arreglar subida (no se suben)
- El agente pega el **link de la carpeta de Drive** (solo la subcarpeta "web", no "originales").
- La automation entra al link, **descarga las fotos** y las sube en Ventana 2 → "Fotos y multimedia".
- Permisos Drive: probar con **Lector** (Chloe no quiere "Administrador de contenido" porque cualquier agente podría borrar). Si Lector no funciona para descargar → plan B (service account Google).
- Orden: drones SIEMPRE al final (Idealista los rechaza como principal).

---

## 6. Notificaciones a Chloe
- Al subir un agente una propiedad → notificación CLARA a Chloe: *"[Agente] ha subido una propiedad. Entra en Sooprema y verifícala."*
- La notificación debe ser **clickeable** → lleva a la propiedad subida dentro del Dashboard (para que Chloe vea cuál es).

---

## 7. Pendientes / a confirmar
- [ ] Captura del desplegable **Construction type**.
- [ ] Botón exacto de "Confirmar y salir" que guarda en Propiedades ocultas.
- [ ] Framework/patrón de descripción IA (lo enviará Marco después).
- [ ] Confirmar permiso Drive (Lector vs service account).
