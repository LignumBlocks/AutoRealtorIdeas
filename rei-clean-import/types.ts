
export type SofloStatus = 'NOT_PRESENT' | 'GROWING_DEMAND' | 'SATURATED' | 'INCONCLUSIVE' | 'UNVERIFIED_MODEL_GUESS';

export type Frequency = 'manual' | 'daily' | 'aggressive' | 'weekly';

// ========== PERLAS ENGINE TYPES ==========

export type PerlaType = 'GOLD' | 'CANDIDATE' | 'IDEA';
export type OfferFormat = 'NET_SHEET' | 'PREP_PLAN' | 'HOA_CONDO_PLAYBOOK';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'KILLED';
export type EvidenceType = 'AD' | 'LANDING' | 'CASE' | 'ASSET' | 'OTHER';

// 7 Dolores v1
export type DolorId =
  | 'HOA_CONDO_SHOCK'
  | 'INHERITANCE_PROBATE'
  | 'DOWNSIZERS_TIMING'
  | 'NET_PROCEEDS_UNCERTAINTY'
  | 'PREP_TO_SELL_FAST'
  | 'PRICE_DROP_STALE_LISTING'
  | 'RELOCATION_WORKFLOW';

export interface EvidenceItem {
  url: string;
  title: string;
  domain: string;
  type: EvidenceType;
  snippet: string;
}

export interface ProofPack {
  evidence_items: EvidenceItem[];
  why_real: string[];       // Gemini fills
  gaps: string[];           // Gemini fills
  confidence_score: number; // 0-100 - calculated by heuristic
}

export interface MiamiSaturation {
  already_common: 'YES' | 'NO' | 'UNKNOWN';
  saturation_score: number; // 0-100
  local_angle: string;
  who_does_it: string[];    // Top domains doing this in Miami
  checked_at?: number;
}

export interface ExperimentPack {
  landing_copy: {
    headlines: string[];
    bullets: string[];
    faq: Array<{ q: string; a: string }>;
    cta: string;
  };
  shorts_script_pack: Array<{
    hook: string;
    script: string;
    cta: string;
    caption: string;
  }>;
  whatsapp_scripts: {
    first_reply: string;
    followup_24h: string;
    followup_72h: string;
  };
  distribution_checklist: string[];
  metrics_tracker: {
    target_optins: number;
    target_convos: number;
    target_citas: number;
    weak_signal: string;
  };
  compliance_block: string;
  iteration_plan: string;
}

// ========== CORE ENTITIES ==========

export interface Topic {
  id: string;
  name: string;
  goal: string;
  market: string;
  searchCount: number;
  depth: 'normal' | 'deep';
  frequency: Frequency;
  lastRun?: number;
  createdAt: number;
  dolor_id?: DolorId; // Link to preset dolor
}

export interface Idea {
  id: string;
  topicId: string;
  runId: string;
  title: string;
  snippet: string;
  summary: string;
  what_they_did: string;
  why_it_worked: string;
  how_to_replicate_md: string;
  budget_usd: number;
  budget_status: string;
  soflo_status: SofloStatus;
  model_score: number;
  final_score: number;
  createdAt: number;
  // === PERLA EXTENSIONS (optional for backward compat) ===
  perla_type?: PerlaType;
  offer_format?: OfferFormat;
  proof_pack?: ProofPack;
  miami_saturation?: MiamiSaturation;
  verification_status?: VerificationStatus;
  next_actions?: string[];  // Max 3 for CANDIDATE
  last_checked_at?: number; // For TTL verification
}

export interface Run {
  id: string;
  topicId: string;
  timestamp: number;
  status: 'completed' | 'failed';
  ideasCount: number;
  depth: 'normal' | 'deep';
  shortlist_ids?: string[]; // IDs of shortlisted ideas (max 5)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
