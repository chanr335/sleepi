import "./Leaderboard.css"; 

function Leaderboard() {
  const players = [
    { id: 1, name: "Alice", score: 1200 },
    { id: 2, name: "Bob", score: 1050 },
    { id: 3, name: "Charlie", score: 980 },
    { id: 4, name: "Diana", score: 860 },
  ];

  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <tr key={player.id}>
                <td>{index + 1}</td>
                <td>{player.name}</td>
                <td>{player.score}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
