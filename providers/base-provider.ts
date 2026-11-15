import { EvidenceItem } from '@/types';

export interface ProviderResponse {
  providerName: string;
  success: boolean;
  evidence: EvidenceItem[];
  latencyMs: number;
  error?: string;
}

export interface IProvider {
  name: string;
  category: 'factcheck' | 'search' | 'news' | 'wiki' | 'academic';
  requiresKey?: boolean;
  isConfigured(): boolean;
  search(query: string, language?: string): Promise<ProviderResponse>;
  ping(): Promise<{ active: boolean; latencyMs: number }>;
}
