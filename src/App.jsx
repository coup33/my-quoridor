/**
 * Quoridor 메인 앱 컴포넌트
 * 리팩토링된 버전 - 모듈화된 컴포넌트와 훅 사용
 */

import React, { useState, useEffect, useMemo } from 'react';

// 스타일
import './styles/index.css';

// 컴포넌트
import { Board, Board3D } from './components/Board';
import { TimeBar, TurnIndicator, SidePanel, GameTitle } from './components/UI';
import { LobbyOverlay } from './components/Lobby';
import { GameOverModal, MenuModal, ResignConfirmModal } from './components/Modal';

// 훅
import { useSocket } from './hooks/useSocket';
import { useGameState } from './hooks/useGameState';
import { useSound } from './hooks/useSound';
import { useGameHandlers } from './hooks/useGameHandlers';

// 유틸리티
import { ACTION_MODES } from './utils/constants';

// 3D 모드 상태
const USE_3D_BOARD = true;

function App() {
  // 로비 상태
  const [myRole, setMyRole] = useState(null);
  const [takenRoles, setTakenRoles] = useState({ 1: null, 2: null });
  const [readyStatus, setReadyStatus] = useState({ 1: false, 2: false });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // 모바일 레이아웃 감지
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const checkMobileLayout = () => {
      const boardSize = Math.min(window.innerWidth, window.innerHeight);
      const leftPanelLeft = window.innerWidth / 2 - boardSize / 2 - 100;
      const titleRight = 80;
      setIsMobileLayout(leftPanelLeft < titleRight);
    };

    checkMobileLayout();
    window.addEventListener('resize', checkMobileLayout);
    return () => window.removeEventListener('resize', checkMobileLayout);
  }, []);

  // 게임 상태 훅
  const gameState = useGameState(myRole);
  const {
    player1, player2, turn, walls, winner, winReason,
    p1Time, p2Time, lastMove, lastWall,
    actionMode, setActionMode, previewWall, setPreviewWall,
    syncWithServer, resetState, isMyTurn
  } = gameState;

  // 사운드 훅
  const { playSound } = useSound();

  // 소켓 핸들러
  const socketHandlers = useMemo(() => ({
    onLobbyUpdate: (data, socketId) => {
      setTakenRoles(data.roles);
      setReadyStatus(data.readyStatus);
      setIsGameStarted(data.isGameStarted);

      if (data.roles[1] !== socketId && data.roles[2] !== socketId) {
        setMyRole(null);
      } else {
        if (data.roles[1] === socketId) setMyRole(1);
        else if (data.roles[2] === socketId) setMyRole(2);
      }
    },
    onGameStart: (started) => {
      setIsGameStarted(started);
      if (started) {
        playSound('start');
        resetState();
        setShowMenu(false);
      } else {
        resetState();
        setShowMenu(false);
      }
    },
    onUpdateState: syncWithServer,
    onInitState: syncWithServer
  }), [playSound, resetState, syncWithServer]);

  // 소켓 훅
  const {
    selectRole: socketSelectRole,
    toggleReady: socketToggleReady,
    emitAction,
    resetGame: socketResetGame,
    resignGame: socketResignGame,
    startAiGame: socketStartAiGame
  } = useSocket(socketHandlers);

  // 파생 상태
  const isSpectator = isGameStarted && myRole !== 1 && myRole !== 2;
  const isFlipped = myRole === 1;
  const topTime = isFlipped ? p2Time : p1Time;
  const bottomTime = isFlipped ? p1Time : p2Time;
  const currentPlayer = turn === 1 ? player1 : player2;

  // 게임 핸들러 훅
  const {
    isMoveableCheck,
    canPlaceWallCheck,
    handleCellClick,
    handleWallClick,
    handleSelectRole,
    handleToggleReady,
    handleStartAiGame,
    handleLeaveRole,
    handleResetGame,
    openResignConfirm,
    confirmResign,
    cancelResign
  } = useGameHandlers({
    // 게임 상태
    player1, player2, turn, walls, winner, isMyTurn, actionMode, previewWall,
    currentPlayer,
    opponentPlayer: turn === 1 ? player2 : player1,
    isGameStarted, myRole,
    // 상태 업데이트 함수
    setPreviewWall, setActionMode, setMyRole, setShowMenu, setShowResignConfirm,
    // 소켓 함수
    emitAction, socketSelectRole, socketToggleReady, socketResetGame, socketResignGame, socketStartAiGame
  });

  // 상단 배지
  const topBadge = useMemo(() => {
    if (!isGameStarted) return null;
    if (isSpectator) {
      return <div className="status-badge badge-spectator">관전 모드</div>;
    }
    return <div className="status-badge badge-ingame">게임 중</div>;
  }, [isGameStarted, isSpectator]);

  // 기권 버튼
  const resignButton = useMemo(() => {
    if (isSpectator || winner || !isGameStarted) return null;
    return (
      <button className="status-badge badge-resign" onClick={openResignConfirm}>
        항복
      </button>
    );
  }, [isSpectator, winner, isGameStarted, openResignConfirm]);

  // 턴 표시
  const turnIndicator = (
    <TurnIndicator
      turn={turn}
      winner={winner}
      myRole={myRole}
      isSpectator={isSpectator}
    />
  );

  return (
    <div className={`container ${isMobileLayout ? 'mobile-mode' : 'desktop-mode'}`}>
      <GameTitle />

      {/* 메뉴 버튼 */}
      {isGameStarted && !isSpectator && (
        <button className="menu-float" onClick={() => setShowMenu(true)}>
          MENU
        </button>
      )}

      {/* 메뉴 모달 */}
      {showMenu && (
        <MenuModal
          onExit={handleResetGame}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* 로비 오버레이 */}
      {!isGameStarted && (
        <LobbyOverlay
          myRole={myRole}
          takenRoles={takenRoles}
          readyStatus={readyStatus}
          onSelectRole={handleSelectRole}
          onToggleReady={handleToggleReady}
          onStartAiGame={handleStartAiGame}
          onLeave={handleLeaveRole}
        />
      )}

      {/* 게임 영역 */}
      <div className={`game-wrapper ${!isGameStarted || winner ? 'blurred' : ''}`}>
        {USE_3D_BOARD ? (
          /* 3D 모드 */
          <main className={`main-content-3d ${isMobileLayout ? 'mobile-mode' : 'desktop-mode'}`}>
            {/* 3D 보드 컨테이너 */}
            <div className="board-fullscreen-3d">
              {/* 상단 타임바 영역 (모바일) */}
              <div className="mobile-top-bar">
                <div className={`mobile-opponent-info ${turn !== myRole ? 'active' : ''}`}>
                  {myRole ? (
                    <>
                      <span className="player-icon">{myRole === 1 ? '⬛' : '⬜'}</span>
                      <span className="player-walls">{myRole === 1 ? player2.wallCount : player1.wallCount}개</span>
                    </>
                  ) : (
                    <>
                      <span className="player-icon">⬛</span>
                      <span className="player-walls">{player2.wallCount}개</span>
                    </>
                  )}
                </div>
                <div className="mobile-timebar-area">
                  <div className="floating-turn-indicator">{turnIndicator}</div>
                  <TimeBar time={topTime} />
                </div>
              </div>

              {/* 3D 보드 */}
              <div className="board-3d-inner">
                <Board3D
                  player1={player1}
                  player2={player2}
                  walls={walls}
                  lastWall={lastWall}
                  isFlipped={isFlipped}
                  isMyTurn={isMyTurn}
                  actionMode={actionMode}
                  previewWall={previewWall}
                  onCellClick={handleCellClick}
                  onWallClick={handleWallClick}
                  isMoveableCheck={isMoveableCheck}
                  canPlaceWallCheck={canPlaceWallCheck}
                />
              </div>

              {/* 하단 타임바 영역 (모바일) */}
              <div className="mobile-bottom-bar">
                <TimeBar time={bottomTime} />
                <div className="mobile-my-controls">
                  <div className={`mobile-my-info ${turn === myRole ? 'active' : ''}`}>
                    {myRole ? (
                      <>
                        <span className="player-icon">{myRole === 1 ? '⬜' : '⬛'}</span>
                        <span className="player-walls">{myRole === 1 ? player1.wallCount : player2.wallCount}개</span>
                      </>
                    ) : (
                      <>
                        <span className="player-icon">⬜</span>
                        <span className="player-walls">{player1.wallCount}개</span>
                      </>
                    )}
                  </div>
                  {myRole && (
                    <div className="mobile-action-buttons">
                      <button
                        className={`floating-action-btn ${actionMode === ACTION_MODES.MOVE ? 'active' : ''}`}
                        onClick={() => setActionMode(ACTION_MODES.MOVE)}
                        disabled={!isMyTurn || winner}
                      >
                        이동
                      </button>
                      <button
                        className={`floating-action-btn ${actionMode === ACTION_MODES.WALL ? 'active' : ''}`}
                        onClick={() => setActionMode(ACTION_MODES.WALL)}
                        disabled={!isMyTurn || winner || currentPlayer.wallCount <= 0}
                      >
                        벽
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 플로팅 UI - 좌측 (데스크탑) */}
            <div className="floating-panel floating-left desktop-only">
              {myRole ? (
                <div className={`floating-player-info ${turn !== myRole ? 'active' : ''}`}>
                  <span className="player-icon">{myRole === 1 ? '⬛' : '⬜'}</span>
                  <span className="player-walls">{myRole === 1 ? player2.wallCount : player1.wallCount}개</span>
                </div>
              ) : (
                <div className={`floating-player-info ${turn === 2 ? 'active' : ''}`}>
                  <span className="player-icon">⬛</span>
                  <span className="player-walls">{player2.wallCount}개</span>
                </div>
              )}
            </div>

            {/* 플로팅 UI - 상단 (데스크탑) */}
            <div className="floating-timebar-top desktop-only">
              <div className="floating-turn-indicator">{turnIndicator}</div>
              <TimeBar time={topTime} />
            </div>

            {/* 플로팅 UI - 하단 (데스크탑) */}
            <div className="floating-timebar-bottom desktop-only">
              <TimeBar time={bottomTime} />
            </div>

            {/* 플로팅 UI - 우측 (데스크탑) */}
            <div className="floating-panel floating-right desktop-only">
              {myRole ? (
                <>
                  <div className={`floating-player-info my-info ${turn === myRole ? 'active' : ''}`}>
                    <span className="player-icon">{myRole === 1 ? '⬜' : '⬛'}</span>
                    <span className="player-walls">{myRole === 1 ? player1.wallCount : player2.wallCount}개</span>
                  </div>
                  <div className="floating-action-row">
                    <button
                      className={`floating-action-btn ${actionMode === ACTION_MODES.MOVE ? 'active' : ''}`}
                      onClick={() => setActionMode(ACTION_MODES.MOVE)}
                      disabled={!isMyTurn || winner}
                    >
                      이동
                    </button>
                    <button
                      className={`floating-action-btn ${actionMode === ACTION_MODES.WALL ? 'active' : ''}`}
                      onClick={() => setActionMode(ACTION_MODES.WALL)}
                      disabled={!isMyTurn || winner || currentPlayer.wallCount <= 0}
                    >
                      벽
                    </button>
                  </div>
                </>
              ) : (
                <div className={`floating-player-info ${turn === 1 ? 'active' : ''}`}>
                  <span className="player-icon">⬜</span>
                  <span className="player-walls">{player1.wallCount}개</span>
                </div>
              )}
            </div>

            {/* 플로팅 UI - 좌측 하단 배지 */}
            <div className="floating-panel floating-bottom-left-badge">
              {topBadge}
              {resignButton}
            </div>
          </main>
        ) : (
          /* 2D 모드 */
          <main className="main-content">
            <SidePanel
              player={player1}
              playerNumber={1}
              isActive={turn === 1}
              isMyRole={myRole === 1}
              isMyTurn={isMyTurn && turn === 1}
              winner={winner}
              actionMode={actionMode}
              onActionModeChange={setActionMode}
              style={{ order: isFlipped ? 3 : 1 }}
            />

            <section className="board-section" style={{ order: 2 }}>
              <TimeBar time={topTime} left={topBadge} center={turnIndicator} right={resignButton} />
              <div className="board-container">
                <Board
                  player1={player1}
                  player2={player2}
                  walls={walls}
                  lastMove={lastMove}
                  lastWall={lastWall}
                  isFlipped={isFlipped}
                  isMyTurn={isMyTurn}
                  actionMode={actionMode}
                  previewWall={previewWall}
                  onCellClick={handleCellClick}
                  onWallClick={handleWallClick}
                  isMoveableCheck={isMoveableCheck}
                  canPlaceWallCheck={canPlaceWallCheck}
                />
              </div>
              <TimeBar time={bottomTime} />
            </section>

            <SidePanel
              player={player2}
              playerNumber={2}
              isActive={turn === 2}
              isMyRole={myRole === 2}
              isMyTurn={isMyTurn && turn === 2}
              winner={winner}
              actionMode={actionMode}
              onActionModeChange={setActionMode}
              style={{ order: isFlipped ? 1 : 3 }}
            />
          </main>
        )}
      </div>

      {/* 게임 종료 모달 */}
      {winner && (
        <GameOverModal
          winner={winner}
          winReason={winReason}
          myRole={myRole}
          isSpectator={isSpectator}
          onReturnToLobby={handleResetGame}
        />
      )}

      {/* 항복 확인 모달 */}
      {showResignConfirm && (
        <ResignConfirmModal
          onConfirm={confirmResign}
          onCancel={cancelResign}
        />
      )}
    </div>
  );
}

export default App;