import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessStyles.css';

function ChessboardComponent() {
    // Game state
    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState(game.fen());
    const [turn, setTurn] = useState('w');
    const [playAs, setPlayAs] = useState('w');
    const [difficulty, setDifficulty] = useState('easy');
    const [gameOverMessage, setGameOverMessage] = useState(null);
    const [moveList, setMoveList] = useState([]);
    const [timeControl, setTimeControl] = useState(300); // 5 minutes default
    const [whiteTime, setWhiteTime] = useState(timeControl);
    const [blackTime, setBlackTime] = useState(timeControl);
    const [errorMessage, setErrorMessage] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [checkAlert, setCheckAlert] = useState(null);
    const [drawOffer, setDrawOffer] = useState(null);
    
    // Server state
    const [savedGames, setSavedGames] = useState([]);
    const [gameHistory, setGameHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('game');

    const gameRef = useRef(game);
    const historyRef = useRef([]);
    const timerRef = useRef(null);
    const aiTimeoutRef = useRef(null);

    // Initialize game and load data
    useEffect(() => {
        gameRef.current = game;
        loadSavedGames();
        loadGameHistory();
    }, []);

    // Reset time when time control changes
    useEffect(() => {
        setWhiteTime(timeControl);
        setBlackTime(timeControl);
    }, [timeControl]);

    // Server communication functions
    const saveGame = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/save_game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: gameRef.current.fen(),
                    moveList,
                    playerColor: playAs,
                    difficulty,
                    timeControl
                }),
            });
            await loadSavedGames();
            alert('Game saved successfully!');
        } catch (error) {
            console.error('Error saving game:', error);
            alert('Failed to save game');
        } finally {
            setIsLoading(false);
        }
    };

    const addToHistory = async (result) => {
        try {
            await fetch('http://localhost:5000/add_to_history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: gameRef.current.fen(),
                    moveList,
                    playerColor: playAs,
                    difficulty,
                    timeControl,
                    result
                }),
            });
            await loadGameHistory();
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    };

    const loadSavedGames = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/get_saved_games');
            const data = await response.json();
            setSavedGames(data.saved_games);
        } catch (error) {
            console.error('Error loading saved games:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadGameHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/get_game_history');
            const data = await response.json();
            setGameHistory(data.game_history);
        } catch (error) {
            console.error('Error loading game history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadGame = async (gameId) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/load_game/${gameId}`);
            const data = await response.json();
            
            const loadedGame = new Chess(data.game_state.fen);
            setGame(loadedGame);
            gameRef.current = loadedGame;
            setFen(data.game_state.fen);
            setMoveList(data.game_state.move_list);
            setPlayAs(data.game_state.player_color);
            setDifficulty(data.game_state.difficulty);
            setTimeControl(data.game_state.timeControl || 300);
            setGameOverMessage(null);
            setCheckAlert(null);
            setDrawOffer(null);
            
            setWhiteTime(data.game_state.timeControl || 300);
            setBlackTime(data.game_state.timeControl || 300);
            
            if (timerRef.current) clearInterval(timerRef.current);
            startClock(loadedGame.turn());
            
            setActiveTab('game');
            alert('Game loaded successfully!');
        } catch (error) {
            console.error('Error loading game:', error);
            alert('Failed to load game');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteSavedGame = async (gameId) => {
        if (!window.confirm('Are you sure you want to delete this saved game?')) return;
        
        setIsLoading(true);
        try {
            await fetch(`http://localhost:5000/delete_saved_game/${gameId}`, {
                method: 'DELETE'
            });
            await loadSavedGames();
            alert('Saved game deleted successfully');
        } catch (error) {
            console.error('Error deleting saved game:', error);
            alert('Failed to delete saved game');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteHistoryItem = async (gameId) => {
        if (!window.confirm('Are you sure you want to delete this history item?')) return;
        
        setIsLoading(true);
        try {
            await fetch(`http://localhost:5000/delete_history_item/${gameId}`, {
                method: 'DELETE'
            });
            await loadGameHistory();
            alert('History item deleted successfully');
        } catch (error) {
            console.error('Error deleting history item:', error);
            alert('Failed to delete history item');
        } finally {
            setIsLoading(false);
        }
    };

    // Game logic functions
    function evaluatePosition(game) {
        const board = game.board();
        let score = 0;
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece) {
                    score += piece.color === 'w' ? pieceValues[piece.type] : -pieceValues[piece.type];
                }
            }
        }
        
        if (game.isCheckmate()) {
            score += game.turn() === 'w' ? -1000 : 1000;
        } else if (game.isCheck()) {
            score += game.turn() === 'w' ? -5 : 5;
        }
        
        return score;
    }

    function makeAiMove() {
        const currentGame = new Chess(fen);
        const possibleMoves = currentGame.moves({ verbose: true });
        
        if (possibleMoves.length === 0) {
            if (currentGame.isCheckmate()) {
                const result = playAs === 'w' ? 'black' : 'white';
                setGameOverMessage(`Checkmate! ${result === 'white' ? 'White' : 'Black'} wins`);
                addToHistory(result);
            }
            return;
        }

        let bestMove = null;
        let bestScore = playAs === 'w' ? -Infinity : Infinity;

        if (currentGame.isCheck()) {
            const escapeMoves = possibleMoves.filter(move => {
                currentGame.move(move);
                const stillInCheck = currentGame.isCheck();
                currentGame.undo();
                return !stillInCheck;
            });
            
            if (escapeMoves.length > 0) {
                bestMove = escapeMoves[Math.floor(Math.random() * escapeMoves.length)];
            } else {
                const result = playAs === 'w' ? 'black' : 'white';
                setGameOverMessage(`Checkmate! ${result === 'white' ? 'White' : 'Black'} wins`);
                addToHistory(result);
                return;
            }
        } else {
            if (difficulty === 'easy') {
                const captures = possibleMoves.filter(m => m.captured);
                const safeMoves = possibleMoves.filter(move => {
                    currentGame.move(move);
                    const isSafe = !currentGame.isCheckmate();
                    currentGame.undo();
                    return isSafe;
                });
                
                bestMove = captures.length > 0 
                    ? captures[Math.floor(Math.random() * captures.length)]
                    : safeMoves[Math.floor(Math.random() * safeMoves.length)];
            } 
            else if (difficulty === 'medium') {
                for (const move of possibleMoves) {
                    currentGame.move(move);
                    const score = evaluatePosition(currentGame);
                    currentGame.undo();

                    if ((playAs === 'w' && score > bestScore) || (playAs === 'b' && score < bestScore)) {
                        bestScore = score;
                        bestMove = move;
                    }
                }
            }
            else if (difficulty === 'hard') {
                for (const move of possibleMoves) {
                    currentGame.move(move);
                    
                    let opponentBestScore = playAs === 'w' ? Infinity : -Infinity;
                    const opponentMoves = currentGame.moves();
                    for (const oppMove of opponentMoves) {
                        currentGame.move(oppMove);
                        const score = evaluatePosition(currentGame);
                        currentGame.undo();

                        if ((playAs === 'w' && score < opponentBestScore) || 
                            (playAs === 'b' && score > opponentBestScore)) {
                            opponentBestScore = score;
                        }
                    }
                    
                    currentGame.undo();

                    if ((playAs === 'w' && opponentBestScore > bestScore) || 
                        (playAs === 'b' && opponentBestScore < bestScore)) {
                        bestScore = opponentBestScore;
                        bestMove = move;
                    }
                }
            }
        }

        if (!bestMove) {
            bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        // Increased delays based on difficulty
        const delay = difficulty === 'easy' ? 1000 : difficulty === 'medium' ? 1500 : 2000;
        aiTimeoutRef.current = setTimeout(() => {
            const result = gameRef.current.move(bestMove);
            if (result) {
                historyRef.current.push(gameRef.current.fen());
                setMoveList(prev => [...prev, result.san]);
                updateGameState();
                
                if (timerRef.current) clearInterval(timerRef.current);
                startClock(gameRef.current.turn());
            }
        }, delay);
    }

    function onPieceDrop(sourceSquare, targetSquare) {
        if (gameOverMessage || turn !== playAs) return false;

        try {
            const move = gameRef.current.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });

            if (!move) throw new Error('Invalid move');

            historyRef.current.push(gameRef.current.fen());
            setMoveList(prev => [...prev, move.san]);
            updateGameState();
            
            if (timerRef.current) clearInterval(timerRef.current);
            startClock(turn === 'w' ? 'b' : 'w');

            return true;
        } catch (err) {
            setErrorMessage('Invalid move!');
            return false;
        }
    }

    function startClock(color) {
        timerRef.current = setInterval(() => {
            if (color === 'w') {
                setWhiteTime(prev => {
                    if (prev <= 0) {
                        clearInterval(timerRef.current);
                        setGameOverMessage("Time out! Black wins.");
                        addToHistory('black');
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                setBlackTime(prev => {
                    if (prev <= 0) {
                        clearInterval(timerRef.current);
                        setGameOverMessage("Time out! White wins.");
                        addToHistory('white');
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);
    }

    function updateGameState() {
        setFen(gameRef.current.fen());
        setTurn(gameRef.current.turn());
        setErrorMessage(null);

        if (gameRef.current.isCheck()) {
            setCheckAlert(gameRef.current.turn() === 'w' ? 'White is in check!' : 'Black is in check!');
        } else {
            setCheckAlert(null);
        }

        if (gameRef.current.isGameOver()) {
            if (timerRef.current) clearInterval(timerRef.current);
            let message = 'Game Over: ';
            let result = null;
            
            if (gameRef.current.isCheckmate()) {
                result = gameRef.current.turn() === 'w' ? 'black' : 'white';
                message += `${result === 'white' ? 'White' : 'Black'} wins by checkmate`;
            } else if (gameRef.current.isDraw()) {
                result = 'draw';
                message += 'Draw';
                if (gameRef.current.isStalemate()) message += ' (Stalemate)';
                else if (gameRef.current.isThreefoldRepetition()) message += ' (Threefold repetition)';
                else if (gameRef.current.isInsufficientMaterial()) message += ' (Insufficient material)';
            }
            
            setGameOverMessage(message);
            if (result) addToHistory(result);
        }
    }

    function restartGame() {
        if (timerRef.current) clearInterval(timerRef.current);
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        
        const newGame = new Chess();
        setGame(newGame);
        gameRef.current = newGame;
        setFen(newGame.fen());
        setTurn('w');
        setMoveList([]);
        historyRef.current = [];
        setWhiteTime(timeControl);
        setBlackTime(timeControl);
        setGameOverMessage(null);
        setErrorMessage(null);
        setCheckAlert(null);
        setDrawOffer(null);
        startClock('w');
    }

    function undoLastMove() {
        if (historyRef.current.length < 1) return;

        // Clear any pending AI move
        if (aiTimeoutRef.current) {
            clearTimeout(aiTimeoutRef.current);
            aiTimeoutRef.current = null;
        }

        // Determine how many moves to undo (always undo both player and AI moves)
        const movesToUndo = turn !== playAs ? 1 : 2;
        
        // Can't undo if not enough moves
        if (historyRef.current.length < movesToUndo) return;

        // Undo the moves
        for (let i = 0; i < movesToUndo; i++) {
            gameRef.current.undo();
            historyRef.current.pop();
        }

        // Update state
        setMoveList(prev => prev.slice(0, -movesToUndo));
        setFen(gameRef.current.fen());
        setTurn(gameRef.current.turn());
        setGameOverMessage(null);
        setCheckAlert(null);
        
        // Reset clock
        if (timerRef.current) clearInterval(timerRef.current);
        startClock(gameRef.current.turn());
    }

    function offerDraw() {
        setDrawOffer(true);
        setTimeout(() => setDrawOffer(null), 10000);
    }

    function respondToDraw(accept) {
        if (accept) {
            setGameOverMessage('Game drawn by agreement');
            addToHistory('draw');
        }
        setDrawOffer(null);
    }

    function giveHint() {
        const moves = gameRef.current.moves();
        if (moves.length > 0) {
            alert(`Hint: Try ${moves[Math.floor(Math.random() * moves.length)]}`);
        }
    }

    useEffect(() => {
        if (!gameOverMessage && turn !== playAs) {
            makeAiMove();
        }
        return () => {
            if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        };
    }, [turn, gameOverMessage, playAs]);

    useEffect(() => {
        startClock('w');
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`chess-container ${darkMode ? 'dark' : ''}`}>
            <h2>React Chess App ♟️</h2>

            <div className="tabs">
                <button 
                    className={activeTab === 'game' ? 'active' : ''}
                    onClick={() => setActiveTab('game')}
                >
                    Game
                </button>
                <button 
                    className={activeTab === 'saved' ? 'active' : ''}
                    onClick={() => setActiveTab('saved')}
                >
                    Saved Games
                </button>
                <button 
                    className={activeTab === 'history' ? 'active' : ''}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>

            {activeTab === 'game' && (
                <>
                    <div className="controls">
                        <label>
                            Play As:
                            <select value={playAs} onChange={(e) => setPlayAs(e.target.value)}>
                                <option value="w">White</option>
                                <option value="b">Black</option>
                            </select>
                        </label>
                        <label>
                            AI Difficulty:
                            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </label>
                        <label>
                            Time Control:
                            <select value={timeControl} onChange={(e) => setTimeControl(Number(e.target.value))}>
                                <option value={300}>5 minutes</option>
                                <option value={600}>10 minutes</option>
                                <option value={900}>15 minutes</option>
                            </select>
                        </label>
                        <button onClick={restartGame}>New Game</button>
                        <button onClick={undoLastMove} disabled={historyRef.current.length === 0 || gameOverMessage}>
                            Undo
                        </button>
                        <button onClick={() => setDarkMode(!darkMode)}>
                            {darkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button onClick={giveHint}>Hint</button>
                        <button onClick={offerDraw} disabled={gameOverMessage}>
                            Offer Draw
                        </button>
                        <button onClick={saveGame} disabled={isLoading || gameOverMessage}>
                            {isLoading ? 'Saving...' : 'Save Game'}
                        </button>
                    </div>

                    <div className="status">
                        <div>Turn: {turn === 'w' ? 'White' : 'Black'}</div>
                        <div>White Time: {formatTime(whiteTime)}</div>
                        <div>Black Time: {formatTime(blackTime)}</div>
                        {checkAlert && <div className="check-alert">{checkAlert}</div>}
                        {errorMessage && <div className="error-message">{errorMessage}</div>}
                        {gameOverMessage && <div className="popup">{gameOverMessage}</div>}
                        {drawOffer && (
                            <div className="draw-offer">
                                <p>Draw offer received</p>
                                <button onClick={() => respondToDraw(true)}>Accept</button>
                                <button onClick={() => respondToDraw(false)}>Decline</button>
                            </div>
                        )}
                    </div>

                    <div className="chessboard-wrapper">
                        <Chessboard
                            position={fen}
                            onPieceDrop={onPieceDrop}
                            boardOrientation={playAs === 'w' ? 'white' : 'black'}
                            customBoardStyle={{
                                borderRadius: '10px',
                                boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                            }}
                        />
                    </div>

                    <div className="move-history">
                        <h3>Move History</h3>
                        <ol>{moveList.map((move, i) => <li key={i}>{move}</li>)}</ol>
                    </div>
                </>
            )}

            {activeTab === 'saved' && (
                <div className="saved-games-container">
                    <h3>Saved Games</h3>
                    <button onClick={loadSavedGames} disabled={isLoading}>
                        {isLoading ? 'Refreshing...' : 'Refresh List'}
                    </button>
                    <div className="saved-games-list">
                        {savedGames.length === 0 ? (
                            <p>No saved games found</p>
                        ) : (
                            savedGames.map((game) => (
                                <div key={game.id} className="saved-game-item">
                                    <div className="game-info">
                                        <div>Difficulty: {game.difficulty}</div>
                                        <div>Player: {game.player_color === 'w' ? 'White' : 'Black'}</div>
                                        <div>Time: {game.timeControl ? `${game.timeControl/60} min` : '5 min'}</div>
                                        <div>Moves: {game.move_list.split(',').length}</div>
                                        <div>Date: {new Date(game.timestamp).toLocaleString()}</div>
                                    </div>
                                    <div className="game-actions">
                                        <button 
                                            onClick={() => loadGame(game.id)}
                                            disabled={isLoading}
                                        >
                                            Load
                                        </button>
                                        <button 
                                            onClick={() => deleteSavedGame(game.id)}
                                            disabled={isLoading}
                                            className="delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="game-history-container">
                    <h3>Game History</h3>
                    <button onClick={loadGameHistory} disabled={isLoading}>
                        {isLoading ? 'Refreshing...' : 'Refresh History'}
                    </button>
                    <div className="history-filters">
                        <label>
                            Filter by difficulty:
                            <select onChange={(e) => {
                                const difficulty = e.target.value;
                                loadGameHistory().then(() => {
                                    if (difficulty !== 'all') {
                                        setGameHistory(prev => 
                                            prev.filter(game => game.difficulty === difficulty)
                                        );
                                    }
                                });
                            }}>
                                <option value="all">All</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </label>
                    </div>
                    <div className="game-history-list">
                        {gameHistory.length === 0 ? (
                            <p>No game history found</p>
                        ) : (
                            gameHistory.map((game) => (
                                <div key={game.id} className="history-item">
                                    <div className="history-info">
                                        <div>Date: {new Date(game.timestamp).toLocaleString()}</div>
                                        <div>Difficulty: {game.difficulty}</div>
                                        <div>Player: {game.player_color === 'w' ? 'White' : 'Black'}</div>
                                        <div>Time: {game.timeControl ? `${game.timeControl/60} min` : '5 min'}</div>
                                        <div>Result: 
                                            <span className={
                                                game.result === 'white' ? 'white-win' :
                                                game.result === 'black' ? 'black-win' : 'draw'
                                            }>
                                                {game.result === 'white' ? 'Won' :
                                                game.result === 'black' ? 'Lost' : 'Drawn'}
                                            </span>
                                        </div>
                                        <div>Moves: {game.move_list.split(',').length}</div>
                                    </div>
                                    <button 
                                        onClick={() => deleteHistoryItem(game.id)}
                                        disabled={isLoading}
                                        className="delete-btn"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                </div>
            )}
        </div>
    );
}

export default ChessboardComponent;