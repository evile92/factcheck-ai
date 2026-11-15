export type ClaimCategory =
  | 'سياسي'
  | 'علمي'
  | 'طبي'
  | 'اقتصادي'
  | 'تاريخي'
  | 'تقني'
  | 'طقس / كوارث'
  | 'جريمة'
  | 'مشاهير'
  | 'رياضة'
  | 'أحداث جارية'
  | 'قوانين'
  | 'أرقام وإحصائيات'
  | 'ادعاء عام'
  | 'سخرية / Satire';

export type VerdictType = 'TRUE' | 'FALSE' | 'MISLEADING' | 'PARTLY_TRUE' | 'UNVERIFIED';

export type SourceTier = 1 | 2 | 3 | 4 | 5;

export type SourceType = 'factcheck' | 'wire' | 'news' | 'official' | 'academic' | 'wiki' | 'social';

export interface EvidenceItem {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDomain: string;
  sourceDate?: string;
  sourceSnippet: string;
  retrievedAt: string;
  sourceType: SourceType;
  reliabilityScore: number; // 0.0 - 1.0
  tier: SourceTier;
  stance: 'supports' | 'refutes' | 'neutral' | 'mentions';
  claimedAspect: string;
}

export interface ExtractedClaim {
  id: string;
  text: string;
  category: ClaimCategory;
  language: string;
  translatedQuery?: string;
  searchQueries: string[];
  evidenceIds: string[];
}

export interface ImageAnalysisResult {
  ocrText: string;
  ocrConfidence: number;
  language: string;
  exif: Record<string, any>;
  hasExif: boolean;
  elaScore: number; // 0 - 100
  pixelEla?: {
    analyzed: boolean;
    method: 'jpeg_recompression' | 'metadata_only';
    meanError: number;
    maxBlockError: number;
    stdDev: number;
    hotspotRatio: number;
    heatmapDataUrl?: string;
  };
  aiProbabilityScore: number; // 0 - 100
  aiProbabilityDisclaimer: string;
  earliestSeenMatch?: {
    date: string;
    url: string;
    context: string;
  };
  manipulationIndicators: string[];
}

export interface VideoTimelineFrame {
  timestamp: string;
  seconds: number;
  thumbnailUrl?: string;
  ocrText?: string;
  sceneDescription?: string;
}

export interface VideoAnalysisResult {
  duration: number;
  timeline: VideoTimelineFrame[];
  transcript: string;
  keyClaims: string[];
  contextMatch?: {
    date?: string;
    context?: string;
  };
}

export interface ContradictionItem {
  claim: string;
  sourceA: {
    name: string;
    url: string;
    stance: string;
    date?: string;
    tier: SourceTier;
  };
  sourceB: {
    name: string;
    url: string;
    stance: string;
    date?: string;
    tier: SourceTier;
  };
  explanation: string;
}

export interface VerificationResult {
  id: string;
  inputType: 'text' | 'url' | 'image' | 'video';
  inputContent: string;
  verdict: VerdictType;
  verdictLabelAr: string;
  verdictLabelEn: string;
  confidence: number;
  confidenceDisclaimer: string;
  summary: string;
  claims: ExtractedClaim[];
  evidence: EvidenceItem[];
  contradictions?: ContradictionItem[];
  mediaAnalysis?: {
    image?: ImageAnalysisResult;
    video?: VideoAnalysisResult;
  };
  earliestContext?: {
    firstSeenDate?: string;
    firstSeenUrl?: string;
    originalContext?: string;
    isRecycled: boolean;
  };
  sourcesCount: number;
  verifiedAt: string;
  executionTimeMs: number;
  stages: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    durationMs?: number;
  }>;
}

export interface ComparisonResult {
  id: string;
  sourceA: {
    input: string;
    title?: string;
    claims: string[];
  };
  sourceB: {
    input: string;
    title?: string;
    claims: string[];
  };
  agreements: string[];
  divergences: string[];
  strongerEvidence: 'sourceA' | 'sourceB' | 'neutral' | 'insufficient';
  strongerExplanation: string;
  verifiedAt: string;
}

export interface ProviderHealth {
  name: string;
  category: 'factcheck' | 'search' | 'news' | 'wiki' | 'academic' | 'media';
  status: 'active' | 'degraded' | 'offline';
  latencyMs: number;
  lastChecked: string;
  freeTier: boolean;
  requiresKey: boolean;
  hasKey: boolean;
  errorCount: number;
}
