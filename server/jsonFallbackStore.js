import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class JsonFallbackStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
  }

  async insert(row) {
    const rows = await this.readRows();
    rows.unshift(row);
    await this.writeRows(rows);
    return row;
  }

  async list(status) {
    const rows = await this.readRows();
    const filtered = status ? rows.filter((row) => row.status === status) : rows;
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async updateStatus(id, status) {
    const rows = await this.readRows();
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      const error = new Error("Indicação não encontrada.");
      error.status = 404;
      throw error;
    }

    rows[index] = {
      ...rows[index],
      status,
      updated_at: new Date().toISOString(),
    };
    await this.writeRows(rows);
    return rows[index];
  }

  async readRows() {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async writeRows(rows) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(rows, null, 2), "utf8");
  }
}
