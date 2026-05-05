'use client'

import { useMemo, useState } from 'react'
import {
  createFolder,
  deleteFolder,
  createItem,
  updateItem,
  deleteItem,
} from '@/actions/knowledge'

type Folder = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  position: number
}

type Item = {
  id: string
  folder_id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  position: number
  source: string
  updated_at: string
}

interface Props {
  initialFolders: Folder[]
  initialItems: Item[]
}

export function KnowledgeView({ initialFolders, initialItems }: Props) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(initialFolders[0]?.id ?? null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showSidebarMobile, setShowSidebarMobile] = useState(false)

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null
  const folderItems = useMemo(() => {
    return items
      .filter((i) => i.folder_id === activeFolderId)
      .filter((i) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return a.position - b.position
      })
  }, [items, activeFolderId, search])

  const activeItem = items.find((i) => i.id === activeItemId) || null

  async function handleNewFolder(name: string) {
    const res = await createFolder({ name })
    if ('error' in res && res.error) {
      alert(res.error)
      return
    }
    if (res.folder) {
      setFolders((prev) => [...prev, res.folder as Folder])
      setActiveFolderId(res.folder.id)
    }
    setShowNewFolder(false)
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('¿Borrar esta carpeta y todas sus fichas? No se puede deshacer.')) return
    const res = await deleteFolder(id)
    if ('error' in res && res.error) {
      alert(res.error)
      return
    }
    setItems((prev) => prev.filter((i) => i.folder_id !== id))
    setFolders((prev) => prev.filter((f) => f.id !== id))
    if (activeFolderId === id) {
      setActiveFolderId(folders[0]?.id ?? null)
      setActiveItemId(null)
    }
  }

  async function handleNewItem() {
    if (!activeFolderId) return
    const res = await createItem({ folder_id: activeFolderId, title: 'Nueva ficha', content: '' })
    if ('error' in res && res.error) {
      alert(res.error)
      return
    }
    if (res.item) {
      setItems((prev) => [...prev, res.item as Item])
      setActiveItemId(res.item.id)
    }
  }

  async function handleSaveItem(patch: { title?: string; content?: string; pinned?: boolean }) {
    if (!activeItemId) return
    const res = await updateItem(activeItemId, patch)
    if ('error' in res && res.error) {
      alert(res.error)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === activeItemId ? { ...i, ...patch, updated_at: new Date().toISOString() } : i)),
    )
  }

  async function handleDeleteItem() {
    if (!activeItemId) return
    if (!confirm('¿Borrar esta ficha?')) return
    const res = await deleteItem(activeItemId)
    if ('error' in res && res.error) {
      alert(res.error)
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== activeItemId))
    setActiveItemId(null)
  }

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* Sidebar trigger en móvil */}
      <div className="md:hidden">
        <button
          onClick={() => setShowSidebarMobile(true)}
          className="flex w-full items-center justify-between rounded-xl border border-[#C9A84C]/20 bg-[#0F0F0F] px-4 py-3 text-left text-sm text-[#F5F0E8]"
        >
          <span className="flex items-center gap-2">
            <span>{activeFolder?.icon || '📁'}</span>
            <span className="font-semibold">{activeFolder?.name || 'Selecciona carpeta'}</span>
          </span>
          <span className="text-[#9A9080]">▾</span>
        </button>
      </div>

      {/* SIDEBAR — desktop fijo, móvil sheet */}
      <aside
        className={`${
          showSidebarMobile
            ? 'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:static md:inset-auto md:bg-transparent md:backdrop-blur-none'
            : 'hidden md:block'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowSidebarMobile(false)
        }}
      >
        <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-4 md:relative md:max-h-none md:rounded-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F5F0E8]">Carpetas</h2>
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C]/15 text-[#C9A84C] transition active:scale-95"
              aria-label="Nueva carpeta"
              title="Nueva carpeta"
            >
              +
            </button>
          </div>
          <ul className="space-y-1">
            {folders.map((f) => {
              const count = items.filter((i) => i.folder_id === f.id).length
              const active = f.id === activeFolderId
              return (
                <li key={f.id}>
                  <button
                    onClick={() => {
                      setActiveFolderId(f.id)
                      setActiveItemId(null)
                      setShowSidebarMobile(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                        : 'text-[#D0C8B8] hover:bg-white/5 hover:text-[#F5F0E8]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-base">{f.icon || '📁'}</span>
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-white/5 text-[#9A9080]'}`}>
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            onClick={() => setShowNewFolder(true)}
            className="mt-4 w-full rounded-lg border border-dashed border-[#C9A84C]/30 px-3 py-2 text-xs font-medium text-[#9A9080] transition hover:border-[#C9A84C]/60 hover:text-[#F5F0E8]"
          >
            + Nueva carpeta
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="min-w-0">
        {/* Header carpeta + acciones */}
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#C9A84C]/15 bg-[#0F0F0F] p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeFolder?.icon || '📁'}</span>
              <h2 className="truncate text-base font-bold text-[#F5F0E8]">{activeFolder?.name || 'Sin carpeta'}</h2>
            </div>
            {activeFolder?.description && (
              <p className="mt-0.5 truncate text-[11px] text-[#9A9080]">{activeFolder.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeFolder && (
              <button
                onClick={() => handleDeleteFolder(activeFolder.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[#9A9080] transition hover:bg-red-500/15 hover:text-red-400"
                aria-label="Borrar carpeta"
                title="Borrar carpeta"
              >
                🗑
              </button>
            )}
            <button
              onClick={handleNewItem}
              disabled={!activeFolderId}
              className="rounded-lg bg-[#C9A84C] px-3 py-1.5 text-[12px] font-bold text-black transition active:scale-95 disabled:opacity-40"
            >
              + Ficha
            </button>
          </div>
        </div>

        {/* Buscador */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dentro de esta carpeta..."
          className="mb-3 w-full rounded-xl border border-white/10 bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F0E8] placeholder:text-[#5A554C] focus:border-[#C9A84C]/40 focus:outline-none"
        />

        {/* Lista de fichas + editor */}
        <div className="grid gap-3 md:grid-cols-[280px_1fr]">
          <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto rounded-2xl border border-white/8 bg-[#0F0F0F] p-2">
            {folderItems.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-[#9A9080]">Sin fichas. Pulsa "+ Ficha" para crear.</li>
            )}
            {folderItems.map((it) => {
              const active = it.id === activeItemId
              return (
                <li key={it.id}>
                  <button
                    onClick={() => setActiveItemId(it.id)}
                    className={`flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition ${
                      active
                        ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                        : 'text-[#D0C8B8] hover:bg-white/5 hover:text-[#F5F0E8]'
                    }`}
                  >
                    <span className="flex w-full items-center gap-2">
                      {it.pinned && <span className="text-[10px]">📌</span>}
                      <span className="flex-1 truncate text-[13px] font-semibold">{it.title}</span>
                    </span>
                    <span className="line-clamp-1 text-[11px] text-[#9A9080]">
                      {it.content.replace(/[#*_\n]/g, ' ').slice(0, 80)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="rounded-2xl border border-white/8 bg-[#0F0F0F] p-4">
            {!activeItem ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm text-[#9A9080]">
                <p>Selecciona una ficha para verla.</p>
                <p className="mt-1 text-[11px]">O crea una nueva con "+ Ficha".</p>
              </div>
            ) : (
              <ItemEditor
                key={activeItem.id}
                item={activeItem}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modal nueva carpeta */}
      {showNewFolder && (
        <NewFolderDialog onClose={() => setShowNewFolder(false)} onCreate={handleNewFolder} />
      )}
    </div>
  )
}

function ItemEditor({
  item,
  onSave,
  onDelete,
}: {
  item: Item
  onSave: (patch: { title?: string; content?: string; pinned?: boolean }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [title, setTitle] = useState(item.title)
  const [content, setContent] = useState(item.content)
  const [pinned, setPinned] = useState(item.pinned)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = title !== item.title || content !== item.content || pinned !== item.pinned

  async function save() {
    if (!dirty) return
    setSaving(true)
    await onSave({ title, content, pinned })
    setSaving(false)
    setSavedAt(Date.now())
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-2 text-base font-bold text-[#F5F0E8] focus:border-[#C9A84C]/40 focus:outline-none"
        />
        <button
          onClick={() => setPinned(!pinned)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
            pinned ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-white/5 text-[#9A9080] hover:text-[#F5F0E8]'
          }`}
          aria-label={pinned ? 'Quitar fijado' : 'Fijar arriba'}
          title={pinned ? 'Quitar fijado' : 'Fijar arriba'}
        >
          📌
        </button>
        <button
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#9A9080] transition hover:bg-red-500/15 hover:text-red-400"
          aria-label="Borrar"
          title="Borrar"
        >
          🗑
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={18}
        placeholder="Escribe el contenido de la ficha. Acepta markdown sencillo."
        className="min-h-[300px] flex-1 resize-y rounded-lg border border-white/10 bg-[#0A0A0A] p-3 text-sm leading-relaxed text-[#F5F0E8] placeholder:text-[#5A554C] focus:border-[#C9A84C]/40 focus:outline-none"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#5A554C]">
          {saving
            ? 'Guardando…'
            : savedAt
              ? `Guardado a las ${new Date(savedAt).toLocaleTimeString()}`
              : `Última edición: ${new Date(item.updated_at).toLocaleString()}`}
        </span>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-[#C9A84C] px-4 py-2 text-xs font-bold text-black transition active:scale-95 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

function NewFolderDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#C9A84C]/25 bg-[#0F0F0F] p-5">
        <h3 className="text-base font-bold text-[#F5F0E8]">Nueva carpeta</h3>
        <p className="mt-1 text-xs text-[#9A9080]">Ej: Decisiones de Marco, Errores resueltos, Roles…</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la carpeta"
          className="mt-3 w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0E8] placeholder:text-[#5A554C] focus:border-[#C9A84C]/40 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-[#D0C8B8] hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true)
              await onCreate(name.trim())
              setBusy(false)
            }}
            className="rounded-lg bg-[#C9A84C] px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}
