import { useState, useEffect, useCallback, useRef } from "react";

const TYPE_COLORS = {
  Fire: "#FF6B35",
  Water: "#4FC3F7",
  Grass: "#66BB6A",
  Lightning: "#FFD54F",
  Psychic: "#BA68C8",
  Fighting: "#8D6E63",
  Darkness: "#546E7A",
  Metal: "#90A4AE",
  Dragon: "#5C6BC0",
  Fairy: "#F48FB1",
  Colorless: "#BDBDBD",
  Poison: "#AB47BC",
};

const TYPE_EMOJI = {
  Fire: "🔥", Water: "💧", Grass: "🌿", Lightning: "⚡",
  Psychic: "🔮", Fighting: "🥊", Darkness: "🌑", Metal: "⚙️",
  Dragon: "🐉", Fairy: "✨", Colorless: "⭐", Poison: "☠️",
};

const SUPERTYPE_OPTIONS = ["Pokémon", "Trainer", "Energy"];

export default function PokemonDeckMaker() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState([]);
  const [activeTab, setActiveTab] = useState("search");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedSupertype, setSelectedSupertype] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [deckName, setDeckName] = useState("新しいデッキ");
  const [notification, setNotification] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchTimeout = useRef(null);

  const showNotif = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2000);
  };

  const fetchCards = useCallback(async (q, types, supertype, pg = 1) => {
    setLoading(true);
    try {
      let qParts = [];
      if (q) qParts.push(`name:${q}*`);
      if (types.length > 0) qParts.push(`types:${types.join(" OR types:")}`);
      if (supertype) qParts.push(`supertype:${supertype}`);
      const queryStr = qParts.length > 0 ? qParts.join(" ") : "name:*";
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryStr)}&pageSize=20&page=${pg}&orderBy=-set.releaseDate`;
      const res = await fetch(url, {
  headers: {
    "X-Api-Key": "ecf2ea4f-2bd3-456c-b4ff-3928a3f93825"
  }
});
      const data = await res.json();
      if (pg === 1) setCards(data.data || []);
      else setCards(prev => [...prev, ...(data.data || [])]);
      setTotalCount(data.totalCount || 0);
    } catch (e) {
      showNotif("通信エラーが発生しました", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards("", [], "", 1);
  }, []);

  const handleSearch = (q, types, supertype) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchCards(q, types, supertype, 1);
    }, 400);
  };

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    handleSearch(v, selectedTypes, selectedSupertype);
  };

  const toggleType = (type) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
    setPage(1);
    fetchCards(query, newTypes, selectedSupertype, 1);
  };

  const handleSupertypeChange = (st) => {
    const newSt = selectedSupertype === st ? "" : st;
    setSelectedSupertype(newSt);
    setPage(1);
    fetchCards(query, selectedTypes, newSt, 1);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCards(query, selectedTypes, selectedSupertype, nextPage);
  };

  const addToDeck = (card) => {
    const totalCards = deck.reduce((s, e) => s + e.count, 0);
    if (totalCards >= 60) { showNotif("デッキは60枚まで！", "error"); return; }
    const existing = deck.find(e => e.card.id === card.id);
    const isBasicEnergy = card.supertype === "Energy" && card.subtypes?.includes("Basic");
    const maxCopies = isBasicEnergy ? 99 : 4;
    if (existing) {
      if (existing.count >= maxCopies) { showNotif(`同じカードは${maxCopies}枚まで！`, "error"); return; }
      setDeck(deck.map(e => e.card.id === card.id ? { ...e, count: e.count + 1 } : e));
    } else {
      setDeck([...deck, { card, count: 1 }]);
    }
    showNotif(`${card.name} を追加！`, "success");
  };

  const removeFromDeck = (cardId) => {
    const existing = deck.find(e => e.card.id === cardId);
    if (!existing) return;
    if (existing.count <= 1) setDeck(deck.filter(e => e.card.id !== cardId));
    else setDeck(deck.map(e => e.card.id === cardId ? { ...e, count: e.count - 1 } : e));
  };

  const totalDeckCards = deck.reduce((s, e) => s + e.count, 0);

  const deckByType = deck.reduce((acc, { card, count }) => {
    const type = card.types?.[0] || card.supertype || "その他";
    acc[type] = (acc[type] || 0) + count;
    return acc;
  }, {});

  const deckBySupertype = deck.reduce((acc, { card, count }) => {
    acc[card.supertype] = (acc[card.supertype] || 0) + count;
    return acc;
  }, {});

  const saveDeck = async () => {
    try {
      const deckData = { name: deckName, cards: deck, savedAt: new Date().toISOString() };
      await window.storage.set(`deck:${deckName}`, JSON.stringify(deckData));
      showNotif("デッキを保存しました！", "success");
    } catch (e) {
      showNotif("保存に失敗しました", "error");
    }
  };

  const exportDeck = () => {
    const lines = deck.map(({ card, count }) =>
      `${count}x ${card.name} (${card.set?.name || ""})`
    );
    const text = `デッキ名: ${deckName}\n合計: ${totalDeckCards}枚\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text);
    showNotif("クリップボードにコピーしました！", "success");
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', 'Hiragino Sans', sans-serif",
      background: "linear-gradient(135deg, #0a0a1a 0%, #1a0505 50%, #0a0a1a 100%)",
      minHeight: "100vh",
      color: "#f0f0f0",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* BG pattern */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
        backgroundSize: "30px 30px", pointerEvents: "none"
      }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notification.type === "success" ? "#1b5e20" : notification.type === "error" ? "#b71c1c" : "#1a237e",
          color: "#fff", padding: "10px 20px", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.2s ease",
          border: `1px solid ${notification.type === "success" ? "#4caf50" : notification.type === "error" ? "#f44336" : "#3f51b5"}`,
          fontSize: 14, fontWeight: 600,
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: "linear-gradient(90deg, #b71c1c, #7b1fa2)",
        padding: "0 24px", display: "flex", alignItems: "center",
        gap: 16, height: 60, boxShadow: "0 2px 20px rgba(183,28,28,0.5)",
        position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <div style={{ fontSize: 28, filter: "drop-shadow(0 0 8px gold)" }}>⚡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "#FFD700" }}>
            POKÉMON DECK MAKER
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>
            ポケモンカードデッキビルダー
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <input
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 13,
              width: 140,
            }}
          />
          <div style={{
            background: totalDeckCards === 60 ? "#4caf50" : "#FF6B35",
            color: "#fff", borderRadius: 20, padding: "4px 14px",
            fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: "center",
          }}>
            {totalDeckCards}/60
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 60px)" }}>
        {/* Left: Search Panel */}
        <div style={{
          width: "60%", display: "flex", flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* Search controls */}
          <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="🔍 カード名で検索..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
                borderRadius: 8, padding: "8px 14px", fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
            />
            {/* Supertype tabs */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {SUPERTYPE_OPTIONS.map(st => (
                <button key={st} onClick={() => handleSupertypeChange(st)} style={{
                  padding: "4px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12,
                  background: selectedSupertype === st ? "#b71c1c" : "rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 600, transition: "all 0.15s",
                }}>{st}</button>
              ))}
              <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>
                {totalCount}件
              </div>
            </div>
            {/* Type filter */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {Object.entries(TYPE_EMOJI).map(([type, emoji]) => (
                <button key={type} onClick={() => toggleType(type)} style={{
                  padding: "3px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11,
                  background: selectedTypes.includes(type) ? (TYPE_COLORS[type] || "#666") : "rgba(255,255,255,0.08)",
                  color: "#fff", fontWeight: 600, transition: "all 0.15s",
                  boxShadow: selectedTypes.includes(type) ? `0 0 8px ${TYPE_COLORS[type]}66` : "none",
                }}>
                  {emoji} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Card Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {loading && cards.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
                <div>読み込み中...</div>
              </div>
            ) : (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                }}>
                  {cards.map(card => {
                    const inDeck = deck.find(e => e.card.id === card.id);
                    const isHovered = hoveredCard === card.id;
                    return (
                      <div key={card.id}
                        onMouseEnter={() => setHoveredCard(card.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => addToDeck(card)}
                        style={{
                          position: "relative", cursor: "pointer", borderRadius: 8,
                          overflow: "hidden", border: inDeck ? "2px solid #FFD700" : "2px solid transparent",
                          transform: isHovered ? "scale(1.05)" : "scale(1)",
                          transition: "all 0.15s ease",
                          boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.6)" : "0 2px 8px rgba(0,0,0,0.3)",
                        }}>
                        <img
                          src={card.images?.small}
                          alt={card.name}
                          style={{ width: "100%", display: "block" }}
                          loading="lazy"
                        />
                        {inDeck && (
                          <div style={{
                            position: "absolute", top: 4, right: 4,
                            background: "#FFD700", color: "#000",
                            borderRadius: "50%", width: 22, height: 22,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 900,
                          }}>
                            {inDeck.count}
                          </div>
                        )}
                        {isHovered && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
                            padding: "12px 6px 6px",
                            fontSize: 10, color: "#fff", fontWeight: 600, textAlign: "center",
                          }}>
                            {card.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {cards.length < totalCount && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button onClick={loadMore} disabled={loading} style={{
                      background: "rgba(255,255,255,0.1)", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
                      padding: "8px 24px", cursor: "pointer", fontSize: 13,
                    }}>
                      {loading ? "読み込み中..." : "もっと見る"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Deck Panel */}
        <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
          {/* Deck tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.3)", flexShrink: 0,
          }}>
            {[["list", "デッキリスト"], ["stats", "統計"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                flex: 1, padding: "12px", border: "none", cursor: "pointer", fontSize: 13,
                background: activeTab === id ? "rgba(183,28,28,0.3)" : "transparent",
                color: activeTab === id ? "#FFD700" : "rgba(255,255,255,0.6)",
                fontWeight: activeTab === id ? 700 : 400,
                borderBottom: activeTab === id ? "2px solid #FFD700" : "2px solid transparent",
                transition: "all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {activeTab === "list" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {deck.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🃏</div>
                  <div style={{ fontSize: 14 }}>カードをクリックして<br />デッキに追加しましょう</div>
                </div>
              ) : (
                <>
                  {["Pokémon", "Trainer", "Energy"].map(st => {
                    const group = deck.filter(e => e.card.supertype === st);
                    if (group.length === 0) return null;
                    const count = group.reduce((s, e) => s + e.count, 0);
                    return (
                      <div key={st} style={{ marginBottom: 16 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                          letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{
                            width: 4, height: 4, borderRadius: "50%",
                            background: st === "Pokémon" ? "#e74c3c" : st === "Trainer" ? "#3498db" : "#2ecc71",
                            display: "inline-block",
                          }} />
                          {st} ×{count}
                        </div>
                        {group.map(({ card, count }) => {
                          const typeColor = TYPE_COLORS[card.types?.[0]] || "#999";
                          return (
                            <div key={card.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "6px 8px", borderRadius: 6, marginBottom: 4,
                              background: "rgba(255,255,255,0.05)",
                              transition: "background 0.1s",
                            }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            >
                              <img src={card.images?.small} alt="" style={{ width: 32, height: 44, objectFit: "cover", borderRadius: 3 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                                  {card.types?.map(t => (
                                    <span key={t} style={{ color: TYPE_COLORS[t] }}>{TYPE_EMOJI[t]} {t} </span>
                                  ))}
                                  {card.set?.name}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={() => removeFromDeck(card.id)} style={{
                                  width: 22, height: 22, borderRadius: "50%", border: "none",
                                  background: "rgba(244,67,54,0.3)", color: "#f44336",
                                  cursor: "pointer", fontSize: 14, lineHeight: "22px", padding: 0,
                                }}>−</button>
                                <span style={{
                                  width: 24, textAlign: "center", fontSize: 13, fontWeight: 700,
                                  color: count >= 4 ? "#FFD700" : "#fff",
                                }}>{count}</span>
                                <button onClick={() => addToDeck(card)} style={{
                                  width: 22, height: 22, borderRadius: "50%", border: "none",
                                  background: "rgba(76,175,80,0.3)", color: "#4caf50",
                                  cursor: "pointer", fontSize: 14, lineHeight: "22px", padding: 0,
                                }}>＋</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {/* Deck completion */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: 1 }}>デッキ完成度</div>
                <div style={{
                  height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", width: `${(totalDeckCards / 60) * 100}%`,
                    background: totalDeckCards === 60 ? "linear-gradient(90deg, #4caf50, #8bc34a)" : "linear-gradient(90deg, #b71c1c, #FF6B35)",
                    transition: "width 0.3s ease", borderRadius: 4,
                  }} />
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#FFD700", marginTop: 4 }}>{totalDeckCards}/60枚</div>
              </div>

              {/* By supertype */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, letterSpacing: 1 }}>カード種別</div>
                {Object.entries(deckBySupertype).map(([st, cnt]) => (
                  <div key={st} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", width: 60 }}>{st}</div>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${(cnt / totalDeckCards) * 100}%`,
                        background: st === "Pokémon" ? "#e74c3c" : st === "Trainer" ? "#3498db" : "#2ecc71",
                        borderRadius: 3,
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, width: 30, textAlign: "right" }}>{cnt}</div>
                  </div>
                ))}
              </div>

              {/* By type */}
              {Object.keys(deckByType).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, letterSpacing: 1 }}>タイプ別</div>
                  {Object.entries(deckByType).sort((a, b) => b[1] - a[1]).map(([type, cnt]) => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: TYPE_COLORS[type] || "#fff", width: 80, display: "flex", alignItems: "center", gap: 4 }}>
                        {TYPE_EMOJI[type] || ""} {type}
                      </div>
                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${(cnt / totalDeckCards) * 100}%`,
                          background: TYPE_COLORS[type] || "#999",
                          borderRadius: 3,
                        }} />
                      </div>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, width: 30, textAlign: "right" }}>{cnt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{
            padding: "12px 16px", background: "rgba(0,0,0,0.4)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", gap: 8,
          }}>
            <button onClick={() => setDeck([])} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(244,67,54,0.4)",
              background: "rgba(244,67,54,0.1)", color: "#f44336",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              クリア
            </button>
            <button onClick={exportDeck} style={{
              flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)", color: "#fff",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              📋 コピー
            </button>
            <button onClick={saveDeck} style={{
              flex: 1, padding: "8px 14px", borderRadius: 8, border: "none",
              background: "linear-gradient(90deg, #b71c1c, #7b1fa2)", color: "#fff",
              cursor: "pointer", fontSize: 12, fontWeight: 700,
            }}>
              💾 保存
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
