# React Chess Game with Flask Backend

This project is a fully functional chess game built with a React frontend and a Flask backend. It allows users to play against an AI with adjustable difficulty, save and load games, view game history, and manage their saved games and history.

## Features

- **Interactive Chessboard:** A user-friendly interface powered by the `react-chessboard` library.
- **Play Against AI:** Challenge an AI opponent with three difficulty levels: Easy, Medium, and Hard.
- **Save and Load Games:** Persist your in-progress games and load them later to continue playing.
- **Game History:** Keep track of your completed games with details like the final position, moves, player color, difficulty, and result.
- **Time Control:** Play with a timed clock (default 5 minutes), adding a strategic element to your games.
- **Undo Move:** Take back your last move for strategic adjustments.
- **Offer Draw:** Propose a draw to your opponent (AI will not respond).
- **Give Hint:** Get a suggestion for a valid move from the AI.
- **Game State Persistence:** The current game state (FEN string) is managed efficiently in the frontend.
- **Backend API:** A Flask backend handles saving, loading, and managing game data in a SQLite database.
- **CORS Enabled:** Properly configured to allow communication between the React frontend (typically on `localhost:3000`) and the Flask backend (on `localhost:5000`).
- **Dark Mode:** Toggle between a light and dark theme for comfortable playing in different environments.
- **Check Alerts:** Visual notifications when a king is in check.

## Technologies Used

**Frontend:**

- [React](https://react.dev/)
- [react-chessboard](https://shaack.com/react-chessboard/)
- [chess.js](https://github.com/jhlywa/chess.js)
- CSS for styling

**Backend:**

- [Flask](https://flask.palletsprojects.com/en/3.0.x/)
- [Flask-CORS](https://flask-cors.readthedocs.io/en/latest/)
- [SQLite3](https://www.sqlite.org/index.html)
- Python

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```

2.  **Install Backend Dependencies:**
    Navigate to the backend directory and install the requirements:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
    *(Note: You might need to create a `requirements.txt` file in your backend directory with `Flask` and `Flask-CORS` listed.)*

3.  **Run the Flask Backend:**
    ```bash
    python app.py
    ```
    The backend should be running on `http://localhost:5000`.

4.  **Install Frontend Dependencies:**
    Navigate to the frontend directory and install the Node.js modules:
    ```bash
    cd frontend
    npm install
    # or
    yarn install
    ```

5.  **Run the React Frontend:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The frontend should be running in your browser, typically on `http://localhost:3000`.

## Project Structure

    \```├── backend/
        │   ├── app.py          # Flask backend application
        │   ├── requirements.txt # Backend dependencies
        │   └── chess_games.db  # SQLite database (created upon first run)
        ├── frontend/
        │   ├── public/
        │   ├── src/
        │   │   ├── components/
        │   │   │   └── ChessboardComponent.js # Main chessboard component
        │   │   ├── App.js
        │   │   ├── index.js
        │   │   ├── ... (other frontend files)
        │   │   └── ChessStyles.css       # Custom CSS for the chessboard
        │   ├── package.json
        │   ├── yarn.lock
        ├── README.md
        └── ... (other project files)```\


## Usage

Once running, interact with the game in your browser:

- **Start Playing:** Make your move on the chessboard.
- **AI Difficulty:** Select the AI strength from the options.
- **Save/Load:** Use the buttons to save your current game and load previously saved games.
- **Game History:** View past games in the history section.
- **Delete:** Remove saved games or history entries.
- **Undo:** Take back your last move.
- **Offer Draw:** Propose a draw.
- **Hint:** Get a suggestion for a move.
- **Dark Mode:** Toggle the theme.

## Database Schema

**`saved_games`:**

| Column        | Type     | Description                               |
| ------------- | -------- | ----------------------------------------- |
| `id`          | INTEGER  | Primary Key, Auto Increment               |
| `fen`         | TEXT     | Current board position (FEN)              |
| `move_list`   | TEXT     | List of moves made (SAN)                  |
| `player_color`| TEXT     | Your color ('w' or 'b')                   |
| `difficulty`  | TEXT     | AI difficulty ('easy', 'medium', 'hard') |
| `timestamp`   | DATETIME | Save timestamp                            |
| `timeControl` | INTEGER  | Time limit in seconds                     |

**`game_history`:**

| Column        | Type     | Description                               |
| ------------- | -------- | ----------------------------------------- |
| `id`          | INTEGER  | Primary Key, Auto Increment               |
| `fen`         | TEXT     | Final board position (FEN)                |
| `move_list`   | TEXT     | All moves made (SAN)                      |
| `player_color`| TEXT     | Your color ('w' or 'b')                   |
| `difficulty`  | TEXT     | AI difficulty                             |
| `result`      | TEXT     | Game outcome ('white', 'black', 'draw')   |
| `timestamp`   | DATETIME | End timestamp                             |
| `timeControl` | INTEGER  | Time limit in seconds                     |

## Contributing

Feel free to contribute by forking the repository and submitting pull requests.

## Acknowledgements

- [react-chessboard](https://shaack.com/react-chessboard/)
- [chess.js](https://github.com/jhlywa/chess.js)
- The Flask and React communities.