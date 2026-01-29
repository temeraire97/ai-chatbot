/**
 * Resume 벡터 시딩 스크립트
 * 사용법: npx tsx scripts/seed-vectors.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import { getEmbedding } from "../lib/rag/embeddings";
import {
  createCollection,
  dropCollection,
  getCollectionStats,
  insertVectors,
} from "../lib/rag/vector-store";
import { resumeChunks } from "../lib/resume/chunks";

async function seedVectors() {
  console.log("🚀 Starting vector seeding...\n");

  // 환경 변수 확인
  const requiredEnvs = ["OPENAI_API_KEY", "ZILLIZ_ENDPOINT", "ZILLIZ_API_KEY"];
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      console.error(`❌ Missing required environment variable: ${env}`);
      process.exit(1);
    }
  }

  try {
    // 1. 컬렉션 생성
    console.log("📦 Creating collection...");
    await createCollection();

    // 2. 임베딩 생성 및 삽입
    console.log(`\n📝 Processing ${resumeChunks.length} chunks...\n`);

    const vectorData: Array<{
      id: string;
      title: string;
      content: string;
      section: string;
      embedding: number[];
    }> = [];

    for (const chunk of resumeChunks) {
      console.log(`  - Embedding: ${chunk.id} (${chunk.title})`);

      // 제목 + 키워드 + 컨텐츠 조합으로 임베딩 생성
      const textToEmbed = `${chunk.title}\n${chunk.keywords.join(", ")}\n${chunk.content}`;
      const embedding = await getEmbedding(textToEmbed);

      vectorData.push({
        id: chunk.id,
        title: chunk.title,
        content: chunk.content,
        section: chunk.section,
        embedding,
      });
    }

    // 3. 벡터 삽입
    console.log("\n📤 Inserting vectors...");
    await insertVectors(vectorData);

    // 4. 통계 확인
    const stats = await getCollectionStats();
    console.log(`\n✅ Seeding complete! Total rows: ${stats.rowCount}`);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// 리셋 옵션
async function resetAndSeed() {
  console.log("🗑️ Dropping existing collection...");
  try {
    await dropCollection();
  } catch {
    console.log("  (Collection did not exist)");
  }
  await seedVectors();
}

// CLI 실행
const args = process.argv.slice(2);
if (args.includes("--reset")) {
  resetAndSeed();
} else {
  seedVectors();
}
