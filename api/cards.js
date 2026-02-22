export default async function handler(req, res) {
  const query = req.query.q || "name:*";
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 20;
  const orderBy = req.query.orderBy || "-set.releaseDate";

  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=${pageSize}&page=${page}&orderBy=${orderBy}`;

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": process.env.POKEMON_API_KEY
    }
  });

  const data = await response.json();
  res.status(200).json(data);
}