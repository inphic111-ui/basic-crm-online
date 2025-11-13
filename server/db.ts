import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, {
        ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL 使用 ON CONFLICT 而不是 onDuplicateKeyUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 音檔管理數據庫查詢函數
 */

// 建立音檔記錄
export async function createRecording(data: {
  userId: number;
  fileName: string;
  fileSize: number;
  filePath: string;
  duration?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { recordings } = await import("../drizzle/schema");
  const result = await db.insert(recordings).values(data).returning();
  return result[0];
}

// 取得用戶的音檔列表
export async function getUserRecordings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { recordings } = await import("../drizzle/schema");
  return db.select().from(recordings).where(eq(recordings.userId, userId));
}

// 取得单個音檔
export async function getRecording(recordingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { recordings } = await import("../drizzle/schema");
  const result = await db.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1);
  return result[0];
}

// 更新音檔狀态
export async function updateRecordingStatus(recordingId: number, status: "pending" | "transcribing" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { recordings } = await import("../drizzle/schema");
  return db.update(recordings).set({ status }).where(eq(recordings.id, recordingId)).returning();
}

// 創建轉錄記錄
export async function createTranscription(data: {
  recordingId: number;
  text?: string;
  language?: string;
  confidence?: number;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { transcriptions } = await import("../drizzle/schema");
  const result = await db.insert(transcriptions).values(data).returning();
  return result[0];
}

// 取得轉錄記錄
export async function getTranscription(recordingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { transcriptions } = await import("../drizzle/schema");
  const result = await db.select().from(transcriptions).where(eq(transcriptions.recordingId, recordingId)).limit(1);
  return result[0];
}

// 更新轉錄記錄
export async function updateTranscription(recordingId: number, data: Partial<{
  text: string;
  language: string;
  confidence: number;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { transcriptions } = await import("../drizzle/schema");
  return db.update(transcriptions).set(data).where(eq(transcriptions.recordingId, recordingId)).returning();
}

// 創建 AI 分析記錄
export async function createAiAnalysis(data: {
  transcriptionId: number;
  analysisType: string;
  result?: string;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { aiAnalyses } = await import("../drizzle/schema");
  const result = await db.insert(aiAnalyses).values(data).returning();
  return result[0];
}

// 取得音檔的所有分析
export async function getRecordingAnalyses(recordingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { aiAnalyses, transcriptions } = await import("../drizzle/schema");
  return db.select().from(aiAnalyses)
    .innerJoin(transcriptions, eq(aiAnalyses.transcriptionId, transcriptions.id))
    .where(eq(transcriptions.recordingId, recordingId));
}

// 創建分析歷史記錄
export async function createAnalysisHistory(data: {
  recordingId: number;
  analysisData: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { analysisHistory } = await import("../drizzle/schema");
  const result = await db.insert(analysisHistory).values(data).returning();
  return result[0];
}

// 取得音檔的分析歷史
export async function getAnalysisHistory(recordingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { analysisHistory } = await import("../drizzle/schema");
  return db.select().from(analysisHistory).where(eq(analysisHistory.recordingId, recordingId)).orderBy((t) => t.timestamp);
}

// TODO: add more feature queries here as your schema grows.
