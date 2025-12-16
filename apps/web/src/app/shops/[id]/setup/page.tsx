'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG } from '@productsynch/shared';
import { FieldMappingRow } from '@/components/setup/FieldMappingRow';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();

  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  // Load mappings on mount
  useEffect(() => {
    if (!accessToken || !params.id) return;
    loadMappings();
  }, [accessToken, params.id]);

  async function loadMappings() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/field-mappings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load mappings');
      const data = await res.json();
      setMappings(data.mappings);
    } catch (err) {
      console.error('[Setup] Failed to load mappings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMappingChange(attribute: string, wooField: string) {
    // Optimistic update
    const newMappings = { ...mappings, [attribute]: wooField };
    setMappings(newMappings);

    // Auto-save to API
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/field-mappings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings: newMappings }),
      });
      if (!res.ok) throw new Error('Failed to save mapping');
    } catch (err) {
      console.error('[Setup] Failed to save mapping', err);
      // TODO: Show error toast, revert optimistic update
    } finally {
      setSaving(false);
    }
  }

  // Filter fields based on search
  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : OPENAI_FEED_SPEC;

  // Group by category
  const categories = Object.entries(CATEGORY_CONFIG)
    .map(([id, config]) => ({
      id: id as any,
      label: config.label,
      order: config.order,
      fields: filteredSpecs.filter((spec) => spec.category === id),
    }))
    .filter((cat) => cat.fields.length > 0)
    .sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading mappings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1021] pl-64">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Field Mapping Setup</h1>
            <p className="text-white/60">
              Map OpenAI feed attributes to your WooCommerce product fields. Changes save automatically.
            </p>
            {saving && (
              <div className="mt-2 text-sm text-[#5df0c0]">
                Saving changes...
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields by name or description..."
              className="w-full px-4 py-3 bg-[#1a1d29] text-white rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]"
            />
          </div>

          {/* Field Mappings - One Continuous List */}
          <div>
            {categories.map((category) => (
              <div key={category.id} className="mb-8">
                {/* Category Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">{category.label}</h2>
                  <p className="text-sm text-white/40 mt-1">{category.fields.length} fields</p>
                </div>

                {/* Field Rows */}
                <div>
                  {category.fields.map((spec) => (
                    <FieldMappingRow
                      key={spec.attribute}
                      spec={spec}
                      currentMapping={mappings[spec.attribute] || null}
                      onMappingChange={handleMappingChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredSpecs.length === 0 && (
            <div className="text-center py-12 text-white/40">
              No fields match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
