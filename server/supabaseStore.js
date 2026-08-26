import { createClient } from "@supabase/supabase-js";

export class SupabaseStore {
  constructor({ url, serviceRoleKey, tableName = "indicacoes" }) {
    this.tableName = tableName;
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async insert(row) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async list(status) {
    let query = this.client.from(this.tableName).select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateStatus(id, status) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const notFound = new Error("Inscrição não encontrada.");
      notFound.status = 404;
      throw notFound;
    }
    return data;
  }
}
