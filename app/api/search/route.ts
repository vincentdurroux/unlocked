import { processSearch } from "../../../api/search";

function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === 503) return true;
  const str = `${error.message || ""} ${error.stack || ""} ${JSON.stringify(error)}`.toLowerCase();
  return (
    str.includes("429") ||
    str.includes("503") ||
    str.includes("unavailable") ||
    str.includes("high demand") ||
    str.includes("quota") ||
    str.includes("exhausted") ||
    str.includes("resource_exhausted") ||
    str.includes("rate limit") ||
    str.includes("too many requests") ||
    str.includes("overloaded") ||
    str.includes("capacity")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, professionals } = body || {};

    const result = await processSearch(query, professionals);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("[app/api/search/route] Search error:", error);
    if (isQuotaOrRateLimitError(error)) {
      return new Response(
        JSON.stringify({
          error: "Jane is very busy right now! Please wait a few seconds and try again, or use the category list in filters to find the pro you need."
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process matching"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
