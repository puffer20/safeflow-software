import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'
// 1. Import the SocketProvider we just made
import { SocketProvider } from './app/context/SocketContext' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. Wrap the App component here */}
    <SocketProvider>
      <App />
    </SocketProvider>
  </React.StrictMode>,
)