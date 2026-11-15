import { NextResponse } from 'next/server';
import { globalProviderRegistry } from '@/providers/provider-registry';
import { globalAIReasoner } from '@/services/ai-reasoner';
import { verificationCache, providerCache } from '@/lib/cache';

export async function GET() {
  try {
    const providers = await globalProviderRegistry.getHealthDashboard();
    const aiEngine = globalAIReasoner.getProviderStatus();

    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      cache: {
        verificationCacheItems: verificationCache.size(),
        providerCacheItems: providerCache.size(),
      },
      aiEngine,
      providers,
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
