const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// --- CONSTANTES ---
const TILE_SIZE = 40;
const COLS = 20;
const ROWS = 15;

// --- ESTADO GLOBAL ---
// Aquí guardaremos todas las salas activas
// Formato: { 'CODIGO': { players: {}, map: [], ... } }
const rooms = {}; 

// Función para generar un ID de sala aleatorio (ej: "X7K2")
function makeId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// --- LÓGICA DE JUEGO (ENCAPSULADA) ---
// Esta función crea el "cerebro" de una partida nueva
function createRoomState() {
    let state = {
        players: {},
        map: [],
        wallGroups: {}, // x,y -> ID
        groupData: {},  // ID -> lista de bloques
        revealedGroups: [],
        status: 'waiting' // waiting, playing
    };

    // Generar Mapa
    let newMap = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let groupIdCounter = 0;

    function addBlockToGroup(r, c, id) {
        newMap[r][c] = 1;
        const key = `${c},${r}`;
        state.wallGroups[key] = id;
        if (!state.groupData[id]) state.groupData[id] = [];
        state.groupData[id].push({ x: c * TILE_SIZE + 20, y: r * TILE_SIZE + 20 });
    }

    // Bordes
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) {
                newMap[y][x] = 1;
            }
        }
    }

    // Obstáculos
    const numShapes = 12;
    for (let i = 0; i < numShapes; i++) {
        let r = Math.floor(Math.random() * (ROWS - 4)) + 2;
        let c = Math.floor(Math.random() * (COLS - 4)) + 2;
        let shapeType = Math.floor(Math.random() * 3);
        let currentGroupId = ++groupIdCounter;

        if (shapeType === 0) { // Línea
            let vertical = Math.random() < 0.5;
            for (let k = 0; k < 3; k++) {
                if (vertical && r + k < ROWS - 1) addBlockToGroup(r + k, c, currentGroupId);
                else if (!vertical && c + k < COLS - 1) addBlockToGroup(r, c + k, currentGroupId);
            }
        } else if (shapeType === 1) { // L
            for (let k = 0; k < 3; k++) {
                 if (r + k < ROWS - 1) addBlockToGroup(r + k, c, currentGroupId);
            }
            if (c + 1 < COLS - 1) addBlockToGroup(r + 2, c + 1, currentGroupId);
        } else { // Bloque
            addBlockToGroup(r, c, currentGroupId);
            if (Math.random() > 0.5) addBlockToGroup(r, c+1, currentGroupId);
        }
    }
    
    state.map = newMap;
    return state;
}

// Función auxiliar para spawn (ahora recibe el mapa de la sala específica)
function getTeamSpawn(isPlayerOne, mapInstance) {
    let minCol = isPlayerOne ? 1 : 13;
    let maxCol = isPlayerOne ? 6 : 18;
    let spawnX, spawnY;
    let attempts = 0;
    
    do {
        let c = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;
        let r = Math.floor(Math.random() * (ROWS - 2)) + 1;
        if (mapInstance[r][c] === 0) {
            spawnX = c * TILE_SIZE + TILE_SIZE / 2;
            spawnY = r * TILE_SIZE + TILE_SIZE / 2;
        }
        attempts++;
    } while (!spawnX && attempts < 100);

    if (!spawnX) return { x: 400, y: 300, rotation: 0 };
    return { x: spawnX, y: spawnY, rotation: isPlayerOne ? 0 : Math.PI };
}

// --- CONEXIÓN ---

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // 1. CREAR NUEVA PARTIDA
    socket.on('createGame', () => {
        const roomCode = makeId(4); // Generar código ej: "A2B4"
        rooms[roomCode] = createRoomState(); // Crear estado nuevo
        
        socket.join(roomCode); // Meter al socket en la "sala" de socket.io
        socket.roomId = roomCode; // Guardar referencia en el socket
        
        console.log(`Sala creada: ${roomCode}`);
        
        // Asignar Jugador 1
        const spawn = getTeamSpawn(true, rooms[roomCode].map);
        rooms[roomCode].players[socket.id] = {
            x: spawn.x, y: spawn.y,
            playerId: socket.id, rotation: spawn.rotation,
            isPlayerOne: true
        };

        // Avisar al cliente que entró y pasarle el código
        socket.emit('gameCode', roomCode);
        // Esperamos al segundo jugador...
        socket.emit('waitingForPlayer'); 
    });

    // 2. UNIRSE A PARTIDA EXISTENTE
    socket.on('joinGame', (roomCode) => {
        const room = rooms[roomCode];
        
        if (!room) {
            socket.emit('errorMsg', 'La sala no existe.');
            return;
        }
        if (Object.keys(room.players).length >= 2) {
            socket.emit('errorMsg', 'La sala está llena.');
            return;
        }

        socket.join(roomCode);
        socket.roomId = roomCode;

        // Asignar Jugador 2
        const spawn = getTeamSpawn(false, room.map);
        room.players[socket.id] = {
            x: spawn.x, y: spawn.y,
            playerId: socket.id, rotation: spawn.rotation,
            isPlayerOne: false
        };

        // ¡ESTAMOS TODOS! INICIAR JUEGO PARA LA SALA
        room.status = 'playing';
        
        // Enviamos datos iniciales a TODA la sala
        io.to(roomCode).emit('mapData', room.map);
        io.to(roomCode).emit('currentPlayers', room.players);
        
        // Enviar muros ya revelados (si hubiera)
        let allRevealed = [];
        room.revealedGroups.forEach(gid => {
             if (room.groupData[gid]) allRevealed = allRevealed.concat(room.groupData[gid]);
        });
        io.to(roomCode).emit('currentWalls', allRevealed);
        
        // Avisar que empieza
        io.to(roomCode).emit('gameStart');
    });

    // --- EVENTOS IN-GAME (Ahora filtrados por Room ID) ---

    socket.on('playerMovement', (movementData) => {
        const room = rooms[socket.roomId];
        if (room && room.status === 'playing' && room.players[socket.id]) {
            room.players[socket.id].x = movementData.x;
            room.players[socket.id].y = movementData.y;
            room.players[socket.id].rotation = movementData.rotation;
            // Solo emitir a la gente de MI sala
            socket.to(socket.roomId).emit('playerMoved', room.players[socket.id]);
        }
    });

    socket.on('wallHit', (wallPos) => {
        const room = rooms[socket.roomId];
        if (!room) return;

        const c = Math.floor(wallPos.x / TILE_SIZE);
        const r = Math.floor(wallPos.y / TILE_SIZE);
        const key = `${c},${r}`;
        const groupId = room.wallGroups[key];

        if (groupId && !room.revealedGroups.includes(groupId)) {
            room.revealedGroups.push(groupId);
            const blocksToReveal = room.groupData[groupId];
            io.to(socket.roomId).emit('wallGroupRevealed', blocksToReveal);
        }
    });

    socket.on('shoot', () => {
        const room = rooms[socket.roomId];
        if(room) socket.to(socket.roomId).emit('playerShot', socket.id);
    });

    socket.on('playerDied', (deadId) => {
        io.to(socket.roomId).emit('gameOver', deadId);
    });

    socket.on('requestRestart', () => {
        const room = rooms[socket.roomId];
        if (!room) return;
        
        // Regenerar mapa SOLO para esta sala
        const newState = createRoomState(); 
        room.map = newState.map;
        room.wallGroups = newState.wallGroups;
        room.groupData = newState.groupData;
        room.revealedGroups = [];

        // Recolocar jugadores
        let p1Processed = false;
        Object.keys(room.players).forEach(id => {
            let isP1 = !p1Processed;
            const newSpawn = getTeamSpawn(isP1, room.map);
            room.players[id].x = newSpawn.x;
            room.players[id].y = newSpawn.y;
            room.players[id].rotation = newSpawn.rotation;
            p1Processed = true;
        });

        io.to(socket.roomId).emit('gameReset', { map: room.map, players: room.players });
    });

    socket.on('disconnect', () => {
        const roomCode = socket.roomId;
        if (roomCode && rooms[roomCode]) {
            // Eliminar jugador de la sala
            delete rooms[roomCode].players[socket.id];
            
            // Avisar al otro jugador
            io.to(roomCode).emit('disconnectPlayer', socket.id);
            
            // Si la sala se queda vacía, la borramos para ahorrar memoria
            if (Object.keys(rooms[roomCode].players).length === 0) {
                delete rooms[roomCode];
                console.log(`Sala ${roomCode} eliminada (vacía)`);
            }
        }
    });
});

http.listen(3000, () => {
    console.log('Servidor Multi-Sala listo en http://localhost:3000');
});