import { findProfile, saveProfile } from "../../services/profile.ts";
import type { ProfileInput } from "../../types/profile.ts";

export async function getProfile(userId: string) {
  return findProfile(userId);
}

// 此入口是使用者手動儲存完整檔案，不供 Agent 自動覆寫使用。
export async function updateProfile(userId: string, input: ProfileInput) {
  return saveProfile(userId, input);
}
