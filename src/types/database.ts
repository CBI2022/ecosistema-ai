export type UserRole = 'admin' | 'agent' | 'secretary' | 'photographer' | 'dc'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  status: UserStatus
  rejection_reason: string | null
  must_change_credentials: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  target_user_id: string | null
  is_read: boolean
  created_at: string
}

export interface UserGoals {
  id: string
  user_id: string
  monthly_income_goal: number
  closings_per_month: number
  listings_per_month: number
  appointments_per_week: number
  calls_per_day: number
  followups_per_day: number
  annual_revenue_goal: number
  created_at: string
  updated_at: string
}

export interface UserMotivation {
  id: string
  user_id: string
  why: string | null
  dream_life: string | null
  motto: string | null
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  agent_id: string
  property_address: string | null
  sale_price: number
  commission: number | null
  commission_percentage: number | null
  closing_date: string
  notes: string | null
  created_at: string
}

export interface Owner {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  phone: string | null
  nif: string | null
  language: string | null
  notes: string | null
  sooprema_owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ListingType = 'sale' | 'rental' | 'rental_temporary'
export type PropertyType =
  | 'villa' | 'apartment' | 'townhouse' | 'land' | 'commercial' | 'penthouse'
  | 'flat' | 'bungalow' | 'duplex' | 'finca' | 'plot' | 'loft'
  | 'country_house' | 'detached_house' | 'semi_detached' | 'terraced_house'
export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type FurnitureStatus = 'none' | 'some' | 'full'
export type OccupationStatus = 'free' | 'empty' | 'rented' | 'occupied_illegally'
export type EnergyCertificate = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type ExpensePeriod = 'annual' | 'monthly' | 'bimonthly' | 'quarterly' | 'weekly' | 'none'

export interface Property {
  id: string
  agent_id: string

  // Identificación
  reference: string | null
  title: string | null
  title_headline: string | null
  title_in_text: string | null

  // Tipo / estado
  property_type: PropertyType | null
  listing_type: ListingType
  status: 'draft' | 'published' | 'archived'
  status_tags: string[] | null
  occupation_status: OccupationStatus | null

  // Precios
  price: number | null
  price_net: number | null
  price_final: number | null
  price_counter_offer: number | null
  rental_amount: number | null
  commission_amount: number | null
  commission_percentage: number | null

  // Estructura
  bedrooms: number | null
  bathrooms: number | null
  toilets: number | null
  living_rooms: number | null
  dining_rooms: number | null
  kitchen_type: string | null
  floor_number: number | null
  total_floors: number | null
  orientation: Orientation | null

  // Áreas
  build_area_m2: number | null
  plot_area_m2: number | null
  useful_area_m2: number | null
  terrace_area_m2: number | null
  garden_area_m2: number | null

  // Años
  year_built: number | null
  year_reformed: number | null

  // Ubicación
  location: string | null
  zone: string | null
  street_name: string | null
  street_number: string | null
  postal_code: string | null
  city: string | null
  latitude: number | null
  longitude: number | null

  // Descripciones
  description_es: string | null
  description_en: string | null
  description_nl: string | null
  views: string | null

  // Features core
  has_pool: boolean
  pool_type: string | null
  has_garage: boolean
  garage_spaces: number | null
  has_garden: boolean
  garden_type: string | null
  has_terrace: boolean
  terrace_type: string | null
  has_ac: boolean
  ac_type: string | null
  has_sea_view: boolean

  // Features extra
  has_fireplace: boolean
  has_storage: boolean
  has_bbq: boolean
  has_alarm: boolean
  has_elevator: boolean
  has_jacuzzi: boolean
  has_balcony: boolean
  has_bar: boolean
  has_guest_apartment: boolean
  has_summer_kitchen: boolean
  furniture_status: FurnitureStatus | null

  // Certificado / portales
  energy_certificate: EnergyCertificate | null
  publish_sooprema: boolean
  publish_idealista: boolean
  publish_imoluc: boolean

  // Gastos
  ibi_annual: number | null
  ibi_period: ExpensePeriod
  basura_annual: number | null
  basura_period: ExpensePeriod
  community_annual: number | null
  community_period: ExpensePeriod
  community_observations: string | null

  // Owner
  owner_id: string | null

  // Llaves / visitas
  keys_holder: string | null
  keys_phone: string | null
  keys_pickup: string | null
  keys_count: number | null
  visit_info: string | null

  // Notas internas
  office_description: string | null
  internal_note: string | null

  // Vivienda turística
  tourist_housing_code: string | null
  tourist_housing_status: string | null

  // Fotos
  primary_photo_id: string | null

  // Suprema/Sooprema tracking
  suprema_status: 'pending' | 'publishing' | 'published' | 'error'
  suprema_job_id: string | null
  sooprema_external_id: string | null
  sooprema_public_url: string | null

  created_at: string
  updated_at: string
}

export interface PropertyPhoto {
  id: string
  property_id: string | null
  agent_id: string
  photographer_id: string | null
  storage_path: string
  file_name: string | null
  is_drone: boolean
  sort_order: number
  shoot_id: string | null
  created_at: string
}

export interface PhotoShoot {
  id: string
  agent_id: string
  photographer_id: string | null
  property_address: string | null
  property_reference: string | null
  shoot_date: string
  shoot_time: string
  duration_hours: number
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: string | null
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  user_id: string
  week_start: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  category: string
  label: string
  target: number
  completed: number
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface ExclusiveHome {
  id: string
  title: string
  location: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_m2: number | null
  description: string | null
  cover_image: string | null
  features: string[] | null
  is_active: boolean
  added_by: string | null
  created_at: string
  updated_at: string
}

export interface Competitor {
  id: string
  type: 'agency' | 'agent'
  name: string
  agency_name: string | null
  zone: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  notes: string | null
  added_by: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'next_action' | 'waiting' | 'someday' | 'complete'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ProjectTask {
  id: string
  title: string
  description: string | null
  category: string
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  notes: string | null
  docs_url: string | null
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
  deleted_at: string | null
}

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok'

export interface SocialAccount {
  id: string
  platform: SocialPlatform
  account_handle: string
  account_id_external: string | null
  is_active: boolean
  connected_by: string | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface VideoSource {
  id: string
  source: string
  external_id: string | null
  title: string | null
  description: string | null
  thumbnail_url: string | null
  video_url: string | null
  published_at: string | null
  duration_seconds: number | null
  opus_job_id: string | null
  opus_status: 'pending' | 'processing' | 'done' | 'error'
  created_at: string
}

export interface Clip {
  id: string
  video_source_id: string | null
  external_clip_id: string | null
  title: string | null
  preview_url: string | null
  video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  virality_score: number | null
  transcript: string | null
  status: 'available' | 'scheduled' | 'published' | 'archived'
  created_at: string
}

export interface ScheduledPost {
  id: string
  clip_id: string | null
  platforms: string[]
  caption: string | null
  hashtags: string | null
  scheduled_for: string
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled'
  published_urls: Record<string, string> | null
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PlatformMetrics {
  id: string
  platform: SocialPlatform
  snapshot_date: string
  followers: number
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number | null
  top_post_url: string | null
  created_at: string
}

export interface SupremaJob {
  id: string
  property_id: string
  agent_id: string
  status: 'queued' | 'running' | 'done' | 'error'
  logs: string[] | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      user_goals: {
        Row: UserGoals
        Insert: Omit<UserGoals, 'id' | 'created_at' | 'updated_at' | 'annual_revenue_goal'>
        Update: Partial<Omit<UserGoals, 'id' | 'created_at' | 'annual_revenue_goal'>>
      }
      user_motivation: {
        Row: UserMotivation
        Insert: Omit<UserMotivation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserMotivation, 'id' | 'created_at'>>
      }
      sales: {
        Row: Sale
        Insert: Omit<Sale, 'id' | 'created_at'>
        Update: Partial<Omit<Sale, 'id' | 'created_at'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id' | 'created_at'>>
      }
      property_photos: {
        Row: PropertyPhoto
        Insert: Omit<PropertyPhoto, 'id' | 'created_at'>
        Update: Partial<Omit<PropertyPhoto, 'id' | 'created_at'>>
      }
      photo_shoots: {
        Row: PhotoShoot
        Insert: Omit<PhotoShoot, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PhotoShoot, 'id' | 'created_at'>>
      }
      checklist_items: {
        Row: ChecklistItem
        Insert: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ChecklistItem, 'id' | 'created_at'>>
      }
      exclusive_homes: {
        Row: ExclusiveHome
        Insert: Omit<ExclusiveHome, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ExclusiveHome, 'id' | 'created_at'>>
      }
      competitors: {
        Row: Competitor
        Insert: Omit<Competitor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Competitor, 'id' | 'created_at'>>
      }
      suprema_jobs: {
        Row: SupremaJob
        Insert: Omit<SupremaJob, 'id' | 'created_at'>
        Update: Partial<Omit<SupremaJob, 'id' | 'created_at'>>
      }
    }
  }
}
