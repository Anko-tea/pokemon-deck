import axios from "axios";

export default async function handler(req, res) {
  try {
    const { q = "name:*", page = 1, pageSize = 20, orderBy = "-set.releaseDate" } = req.query;
    const response = await axios.get("https://api.pokemontcg.io/v2/cards", {
      params: { q, page, pageSize, orderBy },
      headers: { "X-Api-Key": "ecf2ea4f-2bd3-456c-b4ff-3928a3f93825" }
    });
    res.status(200).json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}