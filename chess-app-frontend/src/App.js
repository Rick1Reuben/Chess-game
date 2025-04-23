import React from 'react';
import ChessboardComponent from './components/Chessboard';
import './App.css'; // You can create this for App-specific styles

function App() {
  return (
    <div className="App">
      <h1>React Chess App</h1>
      <ChessboardComponent />
    </div>
  );
}

export default App;