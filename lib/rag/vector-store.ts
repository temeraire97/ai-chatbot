import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";

/**
 * Zilliz (Milvus) 벡터 스토어 클라이언트
 * Free tier: 100MB, 1M vectors
 */

const COLLECTION_NAME = "resume_chunks";
const VECTOR_DIM = 1536; // text-embedding-3-small

let client: MilvusClient | null = null;

/**
 * Zilliz 클라이언트 초기화
 */
export function getZillizClient(): MilvusClient {
  if (client) {
    return client;
  }

  const endpoint = process.env.ZILLIZ_ENDPOINT;
  const token = process.env.ZILLIZ_API_KEY;

  if (!endpoint || !token) {
    throw new Error("ZILLIZ_ENDPOINT and ZILLIZ_API_KEY are required");
  }

  client = new MilvusClient({
    address: endpoint,
    token,
  });

  return client;
}

/**
 * 컬렉션 생성 (시딩 시 사용)
 */
export async function createCollection(): Promise<void> {
  const milvus = getZillizClient();

  // 기존 컬렉션 확인
  const hasCollection = await milvus.hasCollection({
    collection_name: COLLECTION_NAME,
  });

  if (hasCollection.value) {
    console.log(`[VectorStore] Collection ${COLLECTION_NAME} already exists`);
    return;
  }

  // 컬렉션 생성
  await milvus.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: "id",
        data_type: DataType.VarChar,
        is_primary_key: true,
        max_length: 64,
      },
      {
        name: "title",
        data_type: DataType.VarChar,
        max_length: 256,
      },
      {
        name: "content",
        data_type: DataType.VarChar,
        max_length: 8192,
      },
      {
        name: "section",
        data_type: DataType.VarChar,
        max_length: 32,
      },
      {
        name: "embedding",
        data_type: DataType.FloatVector,
        dim: VECTOR_DIM,
      },
    ],
  });

  // 인덱스 생성
  await milvus.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "embedding",
    index_type: "AUTOINDEX",
    metric_type: "COSINE",
  });

  // 컬렉션 로드
  await milvus.loadCollection({
    collection_name: COLLECTION_NAME,
  });

  console.log(`[VectorStore] Collection ${COLLECTION_NAME} created and loaded`);
}

/**
 * 벡터 삽입
 */
export async function insertVectors(
  data: Array<{
    id: string;
    title: string;
    content: string;
    section: string;
    embedding: number[];
  }>
): Promise<void> {
  const milvus = getZillizClient();

  await milvus.insert({
    collection_name: COLLECTION_NAME,
    data,
  });

  console.log(`[VectorStore] Inserted ${data.length} vectors`);
}

/**
 * 벡터 검색
 */
export async function searchVectors(
  embedding: number[],
  topK = 3
): Promise<
  Array<{
    id: string;
    title: string;
    content: string;
    section: string;
    score: number;
  }>
> {
  const milvus = getZillizClient();

  const results = await milvus.search({
    collection_name: COLLECTION_NAME,
    data: [embedding],
    limit: topK,
    output_fields: ["id", "title", "content", "section"],
  });

  return results.results.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    content: r.content as string,
    section: r.section as string,
    score: r.score,
  }));
}

/**
 * 컬렉션 삭제 (테스트/리셋용)
 */
export async function dropCollection(): Promise<void> {
  const milvus = getZillizClient();

  await milvus.dropCollection({
    collection_name: COLLECTION_NAME,
  });

  console.log(`[VectorStore] Collection ${COLLECTION_NAME} dropped`);
}

/**
 * 컬렉션 통계
 */
export async function getCollectionStats(): Promise<{
  rowCount: number;
}> {
  const milvus = getZillizClient();

  const stats = await milvus.getCollectionStatistics({
    collection_name: COLLECTION_NAME,
  });

  return {
    rowCount: Number(stats.data.row_count),
  };
}
