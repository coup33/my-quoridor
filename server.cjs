const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 모든 주소 허용
    methods: ["GET", "POST"]
  }
});

// 게임 상태
let gameState = {
  p1: { x: 4, y: 0, wallCount: 10 },
  p2: { x: 4, y: 8, wallCount: 10 },
  turn: 1,
  walls: [],
  winner: null
};

// 방 상태 관리
let roles = {
  1: null, // 백색 플레이어 socket ID
  2: null  // 흑색 플레이어 socket ID
};

let readyStatus = {
  1: false,
  2: false
};

let isGameStarted = false;

io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  // 접속자에게 현재 누가 어떤 색을 먹었는지, 게임이 시작됐는지 정보 전송
  socket.emit('lobby_update', { roles, readyStatus, isGameStarted });
  socket.emit('init_state', gameState);

  // 1. 역할 선택 (백색 or 흑색)
  socket.on('select_role', (roleNumber) => {
    // 이미 누가 그 자리를 차지했으면 무시
    if (roles[roleNumber]) return;

    // 기존에 다른 역할을 맡고 있었다면 취소 (자리 이동)
    if (roles[1] === socket.id) roles[1] = null;
    if (roles[2] === socket.id) roles[2] = null;
    readyStatus[1] = false;
    readyStatus[2] = false;

    // 자리 차지
    roles[roleNumber] = socket.id;
    
    // 모든 사람에게 업데이트 알림 (버튼 비활성화를 위해)
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });
  });

  // 2. 게임 시작(준비) 버튼 클릭
  socket.on('player_ready', (roleNumber) => {
    if (roles[roleNumber] !== socket.id) return; // 내 역할이 아니면 무시

    readyStatus[roleNumber] = true;
    io.emit('lobby_update', { roles, readyStatus, isGameStarted });

    // 둘 다 준비되었으면 게임 시작!
    if (readyStatus[1] && readyStatus[2]) {
      isGameStarted = true;
      io.emit('game_start', true);
      io.emit('lobby_update', { roles, readyStatus, isGameStarted });
    }
  });

  // 3. 게임 플레이 (이동/벽설치)
  socket.on('game_action', (newState) => {
    gameState = newState;
    socket.broadcast.emit('update_state', gameState);
  });

  // 4. 초기화 (게임 중단 및 로비로 복귀)
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

  // 5. 접속 종료
  socket.on('disconnect', () => {
    console.log('유저 나감:', socket.id);
    // 나간 유저가 맡고 있던 역할 해제
    if (roles[1] === socket.id) { roles[1] = null; readyStatus[1] = false; }
    if (roles[2] === socket.id) { roles[2] = null; readyStatus[2] = false; }
    
    // 게임 중 누군가 나가면 게임 강제 종료
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