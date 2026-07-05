import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { RoomPage } from './pages/Room';
import { RoomProvider } from './context/RoomContext';

function App() {
  return (
    <RoomProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:id" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </RoomProvider>
  );
}

export default App;
