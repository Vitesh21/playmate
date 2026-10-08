/**
 * Supabase Service — Admin client + Storage helpers.
 *
 * Wraps the Supabase JS SDK using the SERVICE ROLE key (NOT the anonymous
 * key). This means:
 *   • Row-Level Security (RLS) policies are BYPASSED for all DB queries
 *     executed through this.admin. Use only on the trusted API server —
 *     never expose this client to browsers / users.
 *   • Storage operations (upload, public URL, delete) work on buckets
 *     regardless of bucket-level RLS.
 *
 * Initialization happens in onModuleInit (Nest lifecycle hook) so the
 * config is guaranteed to be loaded before the client is instantiated.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "@playmate/config";

@Injectable()
export class SupabaseService implements OnModuleInit {
  /**
   * Supabase client authenticated with the service-role key.
   * Has unrestricted access to Postgres (bypasses RLS) and full control
   * over storage buckets, Auth admin endpoints, etc.
   */
  public admin!: SupabaseClient;
  /**
   * Shorthand reference to this.admin.storage — used for bucket ops.
   * Exposed for convenience so callers don't have to write .admin.storage.
   */
  public storage!: SupabaseClient["storage"];

  /**
   * Nest lifecycle: called once after the module is instantiated and DI
   * is ready. Builds the Supabase admin client + storage reference.
   *
   * Auth options explanation:
   *   autoRefreshToken: false — we are a server, no browser session to refresh.
   *   persistSession: false   — do NOT write the service-role session to disk.
   */
  onModuleInit() {
    const config = getConfig();

    this.admin = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Storage namespace lives on the same client; alias for ergonomics.
    this.storage = this.admin.storage;
  }

  /**
   * Upload (or overwrite) a file into a Supabase Storage bucket.
   *
   * @param bucket      — Storage bucket name (must already exist in Supabase).
   * @param path        — Object key inside the bucket, e.g. "products/123.jpg".
   *                      Folders are virtual (path segments separated by "/").
   * @param file        — Raw file bytes as a Node Buffer.
   * @param contentType — MIME type (e.g. "image/jpeg", "application/pdf").
   *                      Stored with the object and returned in Content-Type
   *                      headers on download.
   * @returns           — Supabase upload data object on success; throws on error.
   *
   * Note: upsert: true means a second upload to the same path OVERWRITES the
   * existing object (idempotent; no 409 conflict).
   */
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) throw error;
    return data;
  }

  /**
   * Resolve the public (unsigned, shareable) URL of an object in a bucket.
   *
   * IMPORTANT: This only works correctly if the bucket itself is marked as
   * "public" in the Supabase dashboard, OR there is a permissive RLS policy
   * on the storage.objects table for anonymous reads. For private buckets
   * use createSignedUrl instead (not currently exposed here).
   *
   * @param bucket — Storage bucket name.
   * @param path   — Object key inside the bucket.
   * @returns      — Fully-qualified HTTPS URL string that can be embedded
   *                 in <img src=...> or shared.
   */
  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete a single object from a storage bucket.
   *
   * @param bucket — Storage bucket name.
   * @param path   — Object key to remove.
   *
   * Note: The SDK's remove() takes an array of paths for batching; here we
   * always pass a single-element array since the callers delete one at a time.
   * Throws on error (e.g. object not found, permission denied).
   */
  async deleteFile(bucket: string, path: string) {
    const { error } = await this.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}
