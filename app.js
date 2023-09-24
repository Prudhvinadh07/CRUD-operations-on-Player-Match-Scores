const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertPlayerCase = (playerObj) => {
  return {
    playerId: playerObj.player_id,
    playerName: playerObj.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    SELECT *
    FROM player_details;
    `;
  const playersList = await db.all(getPlayersQuery);
  response.send(playersList.map((each) => convertPlayerCase(each)));
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT *
    FROM player_details
    WHERE player_id = ${playerId};
    `;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerCase(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    UPDATE player_details
    SET 
        player_name = '${playerName}'
    WHERE player_id = ${playerId};
    `;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

const convertMatchCase = (matchObj) => {
  return {
    matchId: matchObj.match_id,
    match: matchObj.match,
    year: matchObj.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
    SELECT *
    FROM match_details
    WHERE match_id = ${matchId};
    `;
  const match = await db.get(getMatchQuery);
  response.send(convertMatchCase(match));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    SELECT match_details.match_id,
    match_details.match,
    match_details.year
    FROM match_details NATURAL JOIN player_match_score
    WHERE player_id = ${playerId};
    `;
  const matches = await db.all(getPlayerMatchesQuery);

  response.send(matches.map((each) => convertMatchCase(each)));
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT player_details.player_id,
    player_details.player_name
    FROM player_details NATURAL JOIN player_match_score
    WHERE match_id = ${matchId};
    `;
  const players = await db.all(getMatchPlayersQuery);
  response.send(players.map((each) => convertPlayerCase(each)));
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getMatchPlayersStatsQuery = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const playersStats = await db.get(getMatchPlayersStatsQuery);
  response.send(playersStats);
});

module.exports = app;
