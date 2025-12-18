const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const MAX_TIME = 90; 
const START_TIME = 60;
const INCREMENT = 6;  

const INITIAL_GAME_STATE = {
  p1: { x: 4, y: 0, wallCount: 10 },
  p2: { x: 4, y: 8, wallCount: 10 },
  turn: 1,
  walls: [],
  winner: null,
  p1Time: START_TIME,
  p2Time: START_TIME,
  // ★ [추가] 마지막 행동 기록용 상태
  lastMove: null, // { player: 1, x: 4, y: 0 } (말이 이동해온 '이전 위치')
  lastWall: null  // { x, y, orientation } (방금 설치된 벽)
};

let gameState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
let roles = { 1: null, 2: null };
let readyStatus = { 1: false, 2: false };
let isGameStarted = false;
let gameInterval = null;

const broadcastLobby = () => {
  io.emit('lobby_update', { roles, readyStatus, isGameStarted });
};

const startGameTimer = () => {
  if (gameInterval) clearInterval(gameInterval);
  
  gameInterval = setInterval(() => {
    if (!isGameStarted || gameState.winner) {
      clearInterval(gameInterval);
      return;
    }

    if (gameState.turn === 1) {
      gameState.p1Time -= 1;
      if (gameState.p1Time <= 0) {
        gameState.p1Time = 0;
        gameState.winner = 2; 
        io.emit('update_state', gameState);
        clearInterval(gameInterval);
      }
    } else {
      gameState.p2Time -= 1;
      if (gameState.p2Time <= 0) {
        gameState.p2Time = 0;
        gameState.winner = 1; 
        io.emit('update_state', gameState);
        clearInterval(gameInterval);
      }
    }
    
    if (!gameState.winner) {
        io.emit('update_state', gameState); 
    }
  }, 1000);
};

io.on('connection', (socket) => {
  console.log(`[접속] ${socket.id}`);

  socket.emit('lobby_update', { roles, readyStatus, isGameStarted });
  if (isGameStarted) socket.emit('update_state', gameState);

  socket.on('select_role', (roleNumber) => {
    roleNumber = parseInt(roleNumber);
    if (roleNumber === 0) {
      if (roles[1] === socket.id) { roles[1] = null; readyStatus[1] = false; }
      if (roles[2] === socket.id) { roles[2] = null; readyStatus[2] = false; }
    } else {
      if (roles[roleNumber] && roles[roleNumber] !== socket.id) return;
      if (roles[1] === socket.id) { roles[1] = null; readyStatus[1] = false; }
      if (roles[2] === socket.id) { roles[2] = null; readyStatus[2] = false; }
      roles[roleNumber] = socket.id;
    }
    broadcastLobby();
  });

  socket.on('player_ready', (roleNumber) => {
    if (roles[roleNumber] !== socket.id) return;
    readyStatus[roleNumber] = !readyStatus[roleNumber];
    broadcastLobby();

    if (roles[1] && roles[2] && readyStatus[1] && readyStatus[2]) {
      isGameStarted = true;
      gameState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
      io.emit('game_start', true);
      io.emit('update_state', gameState);
      broadcastLobby();
      startGameTimer();
    }
  });

  socket.on('game_action', (newState) => {
    if (roles[1] !== socket.id && roles[2] !== socket.id) return;
    if (gameState.winner) return;

    // ★ [핵심] 상태 비교를 통해 마지막 행동(Last Action) 추적
    let newLastMove = gameState.lastMove; // 기존 값 유지 (턴이 바뀌어도 잔상 유지하고 싶으면)
    let newLastWall = null; // 벽은 방금 둔 것만 하이라이트

    // 1. P1 이동 감지
    if (gameState.p1.x !== newState.p1.x || gameState.p1.y !== newState.p1.y) {
       newLastMove = { player: 1, x: gameState.p1.x, y: gameState.p1.y }; // '이전' 위치 저장
       newLastWall = null; // 벽 하이라이트 제거
    }
    // 2. P2 이동 감지
    else if (gameState.p2.x !== newState.p2.x || gameState.p2.y !== newState.p2.y) {
       newLastMove = { player: 2, x: gameState.p2.x, y: gameState.p2.y }; // '이전' 위치 저장
       newLastWall = null;
    }
    // 3. 벽 설치 감지
    else if ((newState.walls || []).length > (gameState.walls || []).length) {
       // 새로 추가된 벽이 무엇인지 찾음 (배열의 마지막 요소라고 가정)
       const walls = newState.walls || [];
       if (walls.length > 0) {
           newLastWall = walls[walls.length - 1];
       }
       // 벽을 뒀을 때는 잔상을 지울지 말지 결정 (여기선 잔상 유지, 벽만 하이라이트)
    }

    const previousTurn = gameState.turn;
    
    // 상태 업데이트 (+ 마지막 행동 정보 포함)
    gameState = {
        ...newState,
        p1Time: gameState.p1Time, 
        p2Time: gameState.p2Time,
        lastMove: newLastMove, // 추가됨
        lastWall: newLastWall  // 추가됨
    };

    // 시간 추가
    if (previousTurn === 1) {
        gameState.p1Time = Math.min(MAX_TIME, gameState.p1Time + INCREMENT);
    } else {
        gameState.p2Time = Math.min(MAX_TIME, gameState.p2Time + INCREMENT);
    }

    io.emit('update_state', gameState);
  });

  socket.on('resign_game', () => {
    let resignPlayer = null;
    if (roles[1] === socket.id) resignPlayer = 1;
    else if (roles[2] === socket.id) resignPlayer = 2;

    if (resignPlayer && isGameStarted && !gameState.winner) {
        gameState.winner = resignPlayer === 1 ? 2 : 1;
        if (gameInterval) clearInterval(gameInterval);
        io.emit('update_state', gameState);
    }
  });

  socket.on('reset_game', () => {
    if (roles[1] !== socket.id && roles[2] !== socket.id) return;

    if (gameInterval) clearInterval(gameInterval);
    isGameStarted = false;
    readyStatus = { 1: false, 2: false };
    gameState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
    
    io.emit('game_start', false);
    broadcastLobby();
  });

  socket.on('disconnect', () => {
    console.log(`[퇴장] ${socket.id}`);
    const isP1 = roles[1] === socket.id;
    const isP2 = roles[2] === socket.id;

    if (isP1 || isP2) {
      if (isP1) { roles[1] = null; readyStatus[1] = false; }
      if (isP2) { roles[2] = null; readyStatus[2] = false; }
      
      if (isGameStarted) {
        if (gameInterval) clearInterval(gameInterval);
        isGameStarted = false;
        io.emit('game_start', false);
      }
      broadcastLobby();
    } 
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});