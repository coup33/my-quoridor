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

// --- 서버 상태 변수 ---
let gameState = {
  p1: { x: 4, y: 0, wallCount: 10 },
  p2: { x: 4, y: 8, wallCount: 10 },
  turn: 1,
  walls: [],
  winner: null
};

// 역할(1=백, 2=흑)과 준비 상태 관리
let roles = {
  1: null, // Socket ID가 들어감
  2: null
};
let readyStatus = {
  1: false,
  2: false
};
let isGameStarted = false;

io.on('connection', (socket) => {
  console.log(`[접속] 유저 ID: ${socket.id}`);

  // 1. 클라이언트가 "로비 정보 줘!" 하고 요청하면 그때 보냄 (타이밍 이슈 해결)
  socket.on('request_lobby', () => {
    socket.emit('lobby_update', { roles, readyStatus, isGameStarted });
    if (isGameStarted) {
      socket.emit('game_start', true);
      socket.emit('init_state', gameState);
    }
  });

  // 2. 역할 선택
  socket.on('select_role', (roleNumber) => {
    // 이미 누가 자리를 차지했으면 무시
    if (roles[roleNumber] && roles[roleNumber] !== socket.id) return;

    // 기존에 다른 역할을 맡고 있었다면 해제
    if (roles[1] === socket.id) { roles[1] = null; readyStatus[1] = false; }
    if (roles[2] === socket.id) { roles[2] = null; readyStatus[2] = false; }

    // 역할 배정
    roles[roleNumber] = socket.id;
    console.log(`[역할선택] ${socket.id} -> Player ${roleNumber}`);
    
    // *** 중요: 모든 사람에게 최신 상태 전송 ***
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });
  });

  // 3. 준비 완료 (Ready)
  socket.on('player_ready', (roleNumber) => {
    if (roles[roleNumber] !== socket.id) return;

    readyStatus[roleNumber] = !readyStatus[roleNumber]; // 토글 방식
    console.log(`[준비] Player ${roleNumber}: ${readyStatus[roleNumber]}`);
    
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });

    // 둘 다 준비되면 게임 시작
    if (roles[1] && roles[2] && readyStatus[1] && readyStatus[2]) {
      console.log(`[게임시작] Start!`);
      isGameStarted = true;
      io.emit('game_start', true);
      io.emit('init_state', gameState);
      io.emit('lobby_update', { roles, readyStatus, isGameStarted });
    }
  });

  // 4. 게임 액션 (이동/벽)
  socket.on('game_action', (newState) => {
    gameState = newState;
    socket.broadcast.emit('update_state', gameState);
  });

  // 5. 초기화
  socket.on('reset_game', () => {
    gameState = {
      p1: { x: 4, y: 0, wallCount: 10 },
      p2: { x: 4, y: 8, wallCount: 10 },
      turn: 1,
      walls: [],
      winner: null
    };
    isGameStarted = false;
    readyStatus = { 1: false, 2: false };
    
    io.emit('game_start', false);
    io.emit('update_state', gameState);
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });
  });

  // 6. 접속 종료
  socket.on('disconnect', () => {
    console.log(`[퇴장] 유저 ID: ${socket.id}`);
    
    // 나간 사람 역할 비우기
    if (roles[1] === socket.id) { roles[1] = null; readyStatus[1] = false; }
    if (roles[2] === socket.id) { roles[2] = null; readyStatus[2] = false; }
    
    // 게임 중이었으면 게임 펑!
    if (isGameStarted) {
      isGameStarted = false;
      io.emit('game_start', false);
    }
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`서버 실행 중 (포트 ${PORT})`);
});