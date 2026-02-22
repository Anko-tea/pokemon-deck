export default async function handler(req, res) {
  try {
    const query = req.query.q || "name:*";
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 20;
    const orderBy = req.query.orderBy || "-set.releaseDate";

    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=${pageSize}&page=${page}&orderBy=${orderBy}`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": "ecf2ea4f-2bd3-456c-b4ff-3928a3f93825"
      }
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}