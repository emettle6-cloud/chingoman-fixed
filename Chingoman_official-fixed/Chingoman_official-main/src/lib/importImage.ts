import { supabase } from './supabase';

export type ImportImageBucket = 'vehicle-images' | 'spare-part-images';

/**
 * Downloads an external image server-side (via the `import-image` Edge
 * Function) and re-uploads it into one of our own Storage buckets, so the
 * listing no longer depends on a hotlinked URL that the source site could
 * block, move, or take down. Returns our own public URL.
 */
export async function importImageToStorage(sourceUrl: string, bucket: ImportImageBucket): Promise<string> {
  const { data, error } = await supabase.functions.invoke('import-image', {
    body: { url: sourceUrl, bucket },
  });

  if (error) {
    throw new Error(error.message ?? 'Image import failed');
  }
  if (data?.error) {
    throw new Error(data.error as string);
  }
  if (!data?.url) {
    throw new Error('Image import failed: no URL returned');
  }
  return data.url as string;
}
