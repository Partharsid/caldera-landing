import { MetadataRoute } from 'next';
import { supabaseAdmin as supabase } from '@/lib/supabase-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://rrdowntownarcade.in';

  // Fetch all active services
  const { data: services } = await supabase
    .from('services')
    .select('id, updated_at')
    .eq('is_active', true);

  // Define static routes
  const routes = [
    '',
    '/privacy-policy',
    '/refund-policy',
    '/terms-and-conditions',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Map dynamic service routes
  const serviceRoutes = (services || []).map((service) => ({
    url: `${baseUrl}/book/${service.id}`,
    lastModified: service.updated_at || new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  return [...routes, ...serviceRoutes];
}
