import { Injectable, OnModuleInit } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "@playmate/config";

@Injectable()
export class SupabaseService implements OnModuleInit {
  public admin: SupabaseClient;
  public storage: SupabaseClient["storage"];

  onModuleInit() {
    const config = getConfig();

    this.admin = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.storage = this.admin.storage;
  }

  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string) {
    const { error } = await this.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}
