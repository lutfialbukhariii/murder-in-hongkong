const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let players = {};
const daftarSenjata = ["Pisau", "Racun", "Kabel Listrik", "Gunting", "Batu Tumpul", "Pistol", "Tali"];
const daftarBukti = ["Cincin", "Jam Tangan", "Darah", "Rambut", "Surat", "Kunci", "Kacamata"];
let gameState = { solution: { weapon: "", evidence: "" }, isStarted: false };

function mulaiGameBaru() {
    const playerIds = Object.keys(players);
    if (playerIds.length < 2) return;

    const roles = ["Pembunuh (Murderer)", "Ahli Forensik (Scientist)"];
    while (roles.length < playerIds.length) roles.push("Detektif (Investigator)");
    roles.sort(() => Math.random() - 0.5);

    playerIds.forEach((id, index) => {
        players[id].role = roles[index];
        players[id].weapons = [...daftarSenjata].sort(() => 0.5 - Math.random()).slice(0, 4);
        players[id].evidence = [...daftarBukti].sort(() => 0.5 - Math.random()).slice(0, 4);
    });

    const pembunuhId = playerIds.find(id => players[id].role.includes("Pembunuh"));
    if (pembunuhId) {
        gameState.solution.weapon = players[pembunuhId].weapons[Math.floor(Math.random() * 4)];
        gameState.solution.evidence = players[pembunuhId].evidence[Math.floor(Math.random() * 4)];
    }
    
    gameState.isStarted = true;
}

io.on('connection', (socket) => {
    socket.on('joinGame', (username) => {
        players[socket.id] = { id: socket.id, name: username, role: null, weapons: [], evidence: [] };
        io.emit('updatePlayers', Object.values(players));
    });

    socket.on('startGame', () => {
        mulaiGameBaru();
        Object.keys(players).forEach(id => {
            const dataKirim = {
                me: players[id],
                allPlayers: Object.values(players),
                solution: (players[id].role.includes("Pembunuh") || players[id].role.includes("Forensik")) 
                          ? gameState.solution : null
            };
            io.to(id).emit('gameStarted', dataKirim);
        });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', Object.values(players));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server berjalan di port ' + PORT);
});
