// FUB API v1 types (subset usado por el dashboard de CBI).
// Docs: https://docs.followupboss.com/reference

export interface FubMetadata {
  collection: string
  offset: number
  limit: number
  total: number
  next: string | null
  nextLink: string | null
}

export interface FubIdentity {
  account: {
    id: number
    domain: string
    name: string
    owner: { name: string; email: string }
  }
  user: FubUser
}

export interface FubUser {
  id: number
  name: string
  email: string
  fuid?: string
  role: 'Broker' | 'Agent' | 'Lender' | string
  isOwner?: boolean
  isAdmin?: boolean
  isLender?: boolean
}

export interface FubStage {
  id: number
  name: string
  order?: number
  pipelineId?: number
}

export interface FubPipeline {
  id: number
  name: string
  stages?: Array<{ id: number; name: string; order?: number }>
}

export interface FubPerson {
  id: number
  firstName?: string
  lastName?: string
  name?: string
  emails?: Array<{ value: string; type?: string; isPrimary?: boolean }>
  phones?: Array<{ value: string; type?: string; isPrimary?: boolean }>
  stageId?: number
  stage?: string
  source?: string
  sourceUrl?: string
  assignedUserId?: number
  assignedTo?: string
  tags?: string[]
  customFields?: Record<string, unknown>
  lastActivity?: string
  lastCommunication?: string
  created?: string
  updated?: string
  deleted?: boolean
}

export interface FubDeal {
  id: number
  name?: string
  pipelineId?: number
  stageId?: number
  personId?: number
  assignedUserId?: number
  price?: number
  status?: 'Active' | 'Closed' | 'Lost' | string
  created?: string
  updated?: string
  closedAt?: string
}

export interface FubCall {
  id: number
  personId?: number
  userId?: number
  duration?: number // seconds
  outcome?: string
  note?: string
  created?: string
}

export interface FubTextMessage {
  id: number
  personId?: number
  userId?: number
  direction?: 'inbound' | 'outbound' | string
  message?: string
  created?: string
}

export interface FubEmail {
  id: number
  personId?: number
  userId?: number
  direction?: 'inbound' | 'outbound' | string
  subject?: string
  created?: string
}

export interface FubAppointment {
  id: number
  personId?: number
  userId?: number
  title?: string
  description?: string
  start?: string
  end?: string
  outcome?: 'scheduled' | 'held' | 'canceled' | 'no_show' | string
  status?: string
  created?: string
  updated?: string
}

export interface FubTask {
  id: number
  personId?: number
  userId?: number
  type?: string
  description?: string
  dueDate?: string
  completedAt?: string
  isCompleted?: boolean
  created?: string
  updated?: string
}

export interface FubNote {
  id: number
  personId?: number
  userId?: number
  body?: string
  isHtml?: boolean
  created?: string
}

export interface FubEvent {
  id: number
  personId?: number
  type?: string
  source?: string
  created?: string
  property?: Record<string, unknown>
  message?: string
}

export interface FubWebhookSubscription {
  id: number
  event: FubEventName
  url: string
  system?: string
  systemKey?: string
  status?: 'Active' | 'Paused' | 'Failing'
  created?: string
  updated?: string
}

export type FubEventName =
  | 'peopleCreated'
  | 'peopleUpdated'
  | 'peopleTagsCreated'
  | 'peopleDeleted'
  | 'notesCreated'
  | 'callsCreated'
  | 'textMessagesCreated'
  | 'emailsCreated'
  | 'appointmentsCreated'
  | 'appointmentsUpdated'
  | 'dealsCreated'
  | 'dealsUpdated'
  | 'tasksCreated'
  | 'tasksUpdated'
  | 'eventsCreated'

export interface FubWebhookPayload {
  event: FubEventName
  resourceIds: number[]
  eventId?: string
  uri?: string
  created?: string
}

// Paginated list responses (shape común)
export interface FubListResponse<T> {
  _metadata: FubMetadata
  [key: string]: T[] | FubMetadata
}
