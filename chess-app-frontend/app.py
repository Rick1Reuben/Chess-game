from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'chess_games.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    if not os.path.exists(DATABASE):
        with app.app_context():
            db = get_db()
            # Saved games table (manual saves)
            db.execute('''
                CREATE TABLE saved_games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fen TEXT NOT NULL,
                    move_list TEXT NOT NULL,
                    player_color TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            # Game history table (completed games)
            db.execute('''
                CREATE TABLE game_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fen TEXT NOT NULL,
                    move_list TEXT NOT NULL,
                    player_color TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    result TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            db.commit()

@app.route('/save_game', methods=['POST'])
def save_game():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''
        INSERT INTO saved_games (fen, move_list, player_color, difficulty)
        VALUES (?, ?, ?, ?)
    ''', (
        data['fen'],
        ','.join(data['moveList']),
        data['playerColor'],
        data['difficulty']
    ))
    db.commit()
    
    return jsonify({'status': 'success', 'game_id': cursor.lastrowid})

@app.route('/add_to_history', methods=['POST'])
def add_to_history():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''
        INSERT INTO game_history (fen, move_list, player_color, difficulty, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        data['fen'],
        ','.join(data['moveList']),
        data['playerColor'],
        data['difficulty'],
        data['result']
    ))
    db.commit()
    
    return jsonify({'status': 'success'})

@app.route('/get_saved_games', methods=['GET'])
def get_saved_games():
    db = get_db()
    games = db.execute('SELECT * FROM saved_games ORDER BY timestamp DESC').fetchall()
    
    return jsonify({'saved_games': [dict(game) for game in games]})

@app.route('/get_game_history', methods=['GET'])
def get_game_history():
    db = get_db()
    history = db.execute('SELECT * FROM game_history ORDER BY timestamp DESC').fetchall()
    
    return jsonify({'game_history': [dict(game) for game in history]})

@app.route('/load_game/<int:game_id>', methods=['GET'])
def load_game(game_id):
    db = get_db()
    game = db.execute('SELECT * FROM saved_games WHERE id = ?', (game_id,)).fetchone()
    
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    return jsonify({
        'game_state': {
            'fen': game['fen'],
            'move_list': game['move_list'].split(','),
            'player_color': game['player_color'],
            'difficulty': game['difficulty']
        }
    })

@app.route('/delete_saved_game/<int:game_id>', methods=['DELETE'])
def delete_saved_game(game_id):
    db = get_db()
    db.execute('DELETE FROM saved_games WHERE id = ?', (game_id,))
    db.commit()
    return jsonify({'status': 'success'})

@app.route('/delete_history_item/<int:game_id>', methods=['DELETE'])
def delete_history_item(game_id):
    db = get_db()
    db.execute('DELETE FROM game_history WHERE id = ?', (game_id,))
    db.commit()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)