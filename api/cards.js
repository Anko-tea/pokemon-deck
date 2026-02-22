export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "name:*";
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "20";
  const orderBy = searchParams.get("orderBy") || "-set.releaseDate";

  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&page=${page}&orderBy=${orderBy}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": "ecf2ea4f-2bd3-456c-b4ff-3928a3f93825"
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}