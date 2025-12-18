import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// 본인의 Render 서버 주소로 꼭 변경하세요!
const socket = io('https://my-quoridor-server-xxxx.onrender.com');

function App() {
  const initialState = {
    p1: { x: 4, y: 0, wallCount: 10 },
    p2: { x: 4, y: 8, wallCount: 10 },
    turn: 1,
    walls: [],
    actionMode: null,
    winner: null
  };

  const [player1, setPlayer1] = useState(initialState.p1);
  const [player2, setPlayer2] = useState(initialState.p2);
  const [turn, setTurn] = useState(initialState.turn);
  const [walls, setWalls] = useState(initialState.walls);
  const [actionMode, setActionMode] = useState(initialState.actionMode);
  const [winner, setWinner] = useState(initialState.winner);
  
  // --- 새로운 로비 시스템 상태 ---
  const [myRole, setMyRole] = useState(null); // 1(백) or 2(흑) or null
  const [takenRoles, setTakenRoles] = useState({ 1: null, 2: null }); // 누가 자리를 먹었는지
  const [readyStatus, setReadyStatus] = useState({ 1: false, 2: false });
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    // 1. 로비 상태 업데이트 (누가 들어왔는지, 준비했는지)
    socket.on('lobby_update', (data) => {
      setTakenRoles(data.roles);
      setReadyStatus(data.readyStatus);
      setIsGameStarted(data.isGameStarted);
      
      // 내 역할 유지 확인 (서버가 재시작되면 끊길 수 있으므로)
      if (data.roles[1] !== socket.id && myRole === 1) setMyRole(null);
      if (data.roles[2] !== socket.id && myRole === 2) setMyRole(null);
    });

    // 2. 게임 시작 신호
    socket.on('game_start', (started) => {
      setIsGameStarted(started);
    });

    // 3. 게임 상태 동기화
    socket.on('init_state', (state) => syncWithServer(state));
    socket.on('update_state', (state) => syncWithServer(state));

    return () => {
      socket.off('lobby_update');
      socket.off('game_start');
      socket.off('init_state');
      socket.off('update_state');
    };
  }, [myRole]);

  const syncWithServer = (state) => {
    setPlayer1(state.p1);
    setPlayer2(state.p2);
    setTurn(state.turn);
    setWalls(state.walls);
    setWinner(state.winner);
    setActionMode(null);
  };

  const emitAction = (newState) => {
    socket.emit('game_action', newState);
  };

  // --- 로비 액션 ---
  const selectRole = (role) => {
    socket.emit('select_role', role);
    setMyRole(role);
  };

  const toggleReady = () => {
    if (myRole) socket.emit('player_ready', myRole);
  };

  const resetGame = () => {
    socket.emit('reset_game');
  };

  // --- 게임 로직 ---
  const isMyTurn = turn === myRole;
  
  const isMoveable = (targetX, targetY) => {
    if (!isGameStarted || !isMyTurn || actionMode !== 'move' || winner) return false;
    const current = turn === 1 ? player1 : player2;
    const opponent = turn === 1 ? player2 : player1;
    const diffX = Math.abs(current.x - targetX);
    const diffY = Math.abs(current.y - targetY);
    const isAdjacent = (diffX === 1 && diffY === 0) || (diffX === 0 && diffY === 1);
    const isOccupied = targetX === opponent.x && targetY === opponent.y;
    return isAdjacent && !isOccupied;
  };

  const canPlaceWall = (x, y, orientation) => {
    if (!isGameStarted || winner || !isMyTurn) return false;
    return !walls.some(w => {
      if (w.x === x && w.y === y && w.orientation === orientation) return true;
      if (w.orientation === orientation) {
        if (orientation === 'h' && w.y === y && Math.abs(w.x - x) === 1) return true;
        if (orientation === 'v' && w.x === x && Math.abs(w.y - y) === 1) return true;
      }
      if (w.x === x && w.y === y && w.orientation !== orientation) return true;
      return false;
    });
  };

  const handleCellClick = (x, y) => {
    if (!isMoveable(x, y)) return;
    let nextState = { p1: player1, p2: player2, turn: turn === 1 ? 2 : 1, walls, winner: null };
    if (turn === 1) {
      nextState.p1 = { ...player1, x, y };
      if (nextState.p1.y === 8) nextState.winner = 1;
    } else {
      nextState.p2 = { ...player2, x, y };
      if (nextState.p2.y === 0) nextState.winner = 2;
    }
    syncWithServer(nextState);
    emitAction(nextState);
  };

  const handleWallClick = (x, y, orientation) => {
    if (actionMode !== 'wall' || !isMyTurn) return;
    const current = turn === 1 ? player1 : player2;
    if (current.wallCount <= 0) return;
    if (!canPlaceWall(x, y, orientation)) return;

    const nextWalls = [...walls, { x, y, orientation }];
    let nextState = { 
      p1: turn === 1 ? { ...player1, wallCount: player1.wallCount - 1 } : player1,
      p2: turn === 2 ? { ...player2, wallCount: player2.wallCount - 1 } : player2,
      turn: turn === 1 ? 2 : 1,
      walls: nextWalls,
      winner: null
    };
    syncWithServer(nextState);
    emitAction(nextState);
  };

  return (
    <div className="container">
      {/* --- 로비 모달 (게임 시작 전) --- */}
      {!isGameStarted && (
        <div className="lobby-overlay">
          <div className="lobby-card">
            <h2 className="lobby-title">QUORIDOR ONLINE</h2>
            
            {/* 1단계: 역할 선택 */}
            {!myRole && (
              <div className="role-selection">
                <p>플레이할 색상을 선택하세요</p>
                <div className="role-buttons">
                  <button 
                    className="role-btn white" 
                    disabled={takenRoles[1] !== null} // 누가 이미 골랐으면 비활성화
                    onClick={() => selectRole(1)}
                  >
                    백색 (Player 1)
                    {takenRoles[1] && <span className="taken-badge">선택됨</span>}
                  </button>
                  <button 
                    className="role-btn black" 
                    disabled={takenRoles[2] !== null}
                    onClick={() => selectRole(2)}
                  >
                    흑색 (Player 2)
                    {takenRoles[2] && <span className="taken-badge">선택됨</span>}
                  </button>
                </div>
              </div>
            )}

            {/* 2단계: 대기 및 시작 */}
            {myRole && (
              <div className="ready-section">
                <p className="my-role-text">
                  당신은 <span className={myRole === 1 ? 't-white' : 't-black'}>
                    {myRole === 1 ? '백색(P1)' : '흑색(P2)'}
                  </span> 입니다
                </p>

                <div className="status-box">
                  <div className={`player-status ${readyStatus[1] ? 'ready' : ''}`}>
                    P1: {takenRoles[1] ? (readyStatus[1] ? '준비 완료!' : '대기 중...') : '접속 기다리는 중...'}
                  </div>
                  <div className={`player-status ${readyStatus[2] ? 'ready' : ''}`}>
                    P2: {takenRoles[2] ? (readyStatus[2] ? '준비 완료!' : '대기 중...') : '접속 기다리는 중...'}
                  </div>
                </div>

                {/* 시작 버튼: 상대가 없으면 "기다리는 중", 다 찼으면 "게임 시작" */}
                {!readyStatus[myRole] ? (
                  <button 
                    className="start-btn" 
                    onClick={toggleReady}
                    disabled={!takenRoles[1] || !takenRoles[2]} // 두 명이 다 들어와야 누를 수 있음
                  >
                    {(!takenRoles[1] || !takenRoles[2]) ? '상대방 기다리는 중...' : '게임 시작 (Ready)'}
                  </button>
                ) : (
                  <button className="start-btn waiting" disabled>
                    상대방 수락 대기 중...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 메인 게임 화면 (게임 중이 아닐 땐 흐리게) --- */}
      <div className={`game-wrapper ${!isGameStarted ? 'blurred' : ''}`}>
        <header className="header">
          <h1 className="game-title">QUORIDOR</h1>
          <div className="role-badge">
            {myRole === 1 ? "나: 백색(P1)" : myRole === 2 ? "나: 흑색(P2)" : "관전 모드"}
          </div>
        </header>

        <main className="main-content">
          <aside className={`side-panel white-area ${turn === 1 && !winner ? 'active' : ''}`}>
            <h2 className="player-label">백색 (P1)</h2>
            <div className="wall-counter white-box"><small>남은 벽</small><div className="count">{player1.wallCount}</div></div>
            <div className="button-group">
              <button className={`btn p1-btn ${actionMode === 'move' ? 'selected' : ''}`} onClick={() => setActionMode('move')} disabled={!isMyTurn || winner}>말 이동</button>
              <button className={`btn p1-btn ${actionMode === 'wall' ? 'selected' : ''}`} onClick={() => setActionMode('wall')} disabled={!isMyTurn || winner}>벽 설치</button>
            </div>
          </aside>

          <section className="board-section">
            <div className="turn-display">
              {winner ? <span className="win-text">{winner === 1 ? '백색 승리!' : '흑색 승리!'}</span> : 
              <span className={turn === 1 ? 't-white' : 't-black'}>
                {turn === 1 ? '● 백색 차례' : '● 흑색 차례'} {isMyTurn && "(당신)"}
              </span>}
            </div>
            <div className="board-container">
              <div className="board">
                {Array.from({ length: 81 }).map((_, i) => {
                  const x = i % 9, y = Math.floor(i / 9);
                  const canMove = isMoveable(x, y);
                  return (
                    <div key={`c-${x}-${y}`} className={`cell ${canMove ? 'highlight' : ''}`} onClick={() => handleCellClick(x, y)}>
                      {player1.x === x && player1.y === y && <div className="pawn white-pawn" />}
                      {player2.x === x && player2.y === y && <div className="pawn black-pawn" />}
                      {canMove && <div className="move-dot" />}
                    </div>
                  );
                })}
                {Array.from({ length: 64 }).map((_, i) => {
                  const x = i % 8, y = Math.floor(i / 8);
                  const isWallMode = actionMode === 'wall' && isMyTurn;
                  const canH = isWallMode && canPlaceWall(x, y, 'h');
                  const canV = isWallMode && canPlaceWall(x, y, 'v');
                  return (
                    <React.Fragment key={`wp-${x}-${y}`}>
                      <div className={`wall-target h ${isWallMode ? 'in-wall-mode' : ''} ${canH ? 'placeable' : ''}`} style={{ left: x * 68, top: y * 68 + 60 }} onClick={() => handleWallClick(x, y, 'h')} />
                      <div className={`wall-target v ${isWallMode ? 'in-wall-mode' : ''} ${canV ? 'placeable' : ''}`} style={{ left: x * 68 + 60, top: y * 68 }} onClick={() => handleWallClick(x, y, 'v')} />
                    </React.Fragment>
                  );
                })}
                {walls.map((wall, i) => (
                  <div key={i} className={`placed-wall ${wall.orientation}`} style={{ left: wall.x * 68 + (wall.orientation === 'v' ? 60 : 0), top: wall.y * 68 + (wall.orientation === 'h' ? 60 : 0) }} />
                ))}
              </div>
            </div>
          </section>

          <aside className={`side-panel black-area ${turn === 2 && !winner ? 'active' : ''}`}>
            <h2 className="player-label">흑색 (P2)</h2>
            <div className="wall-counter black-box"><small>남은 벽</small><div className="count">{player2.wallCount}</div></div>
            <div className="button-group">
              <button className={`btn p2-btn ${actionMode === 'move' ? 'selected' : ''}`} onClick={() => setActionMode('move')} disabled={!isMyTurn || winner}>말 이동</button>
              <button className={`btn p2-btn ${actionMode === 'wall' ? 'selected' : ''}`} onClick={() => setActionMode('wall')} disabled={!isMyTurn || winner}>벽 설치</button>
            </div>
          </aside>
        </main>
        
        {winner && <div className="overlay"><div className="modal"><h2>🎉 {winner === 1 ? '백색' : '흑색'} 승리! 🎉</h2><button className="reset-large" onClick={resetGame}>로비로 돌아가기</button></div></div>}
        
        {/* 게임 중일 때만 초기화 버튼 표시 (혹은 항상 표시해서 중단 가능하게) */}
        {isGameStarted && <button className="reset-float" onClick={resetGame}>🔄 게임 중단</button>}
      </div>
    </div>
  );
}

export default App;