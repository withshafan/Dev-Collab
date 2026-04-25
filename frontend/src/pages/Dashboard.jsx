import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchRoomId, setSearchRoomId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try {
      const res = await API.get('/rooms');
      setRooms(res.data);
    } catch (err) { console.error(err); }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title required');
    try {
      const res = await API.post('/rooms', { title, description });
      setRooms(prev => [res.data, ...prev]);
      setTitle('');
      setDescription('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    }
  };

  const joinRoom = (roomId) => navigate(`/room/${roomId}`);

  const handleJoinById = async () => {
    if (!searchRoomId.trim()) return alert('Enter a Room ID');
    setSearchLoading(true);
    try {
      const res = await API.get(`/rooms/${searchRoomId}`);
      const room = res.data.room;
      if (!room) throw new Error('Not found');
      if (room.hasAccessCode) {
        const code = prompt(`Enter access code for "${room.title}":`);
        if (!code) { setSearchLoading(false); return; }
        const verify = await API.post('/rooms/verify-access', { roomId: searchRoomId, code });
        if (!verify.data.valid) { alert('Wrong code'); setSearchLoading(false); return; }
      }
      navigate(`/room/${searchRoomId}`);
    } catch (err) {
      alert('Room not found or invalid ID');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            DevCollab
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">👋 {user?.name}</span>
            <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition text-sm font-medium">
              Logout
            </button>
          </div>
        </div>

        {/* Join by ID */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">🔗 Join with Room ID</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Paste room ID..."
              value={searchRoomId}
              onChange={(e) => setSearchRoomId(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:ring-blue-600"
            />
            <button onClick={handleJoinById} disabled={searchLoading} className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg transition disabled:opacity-50">
              {searchLoading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>

        {/* Create Room */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">➕ Create New Room</h2>
          <form onSubmit={createRoom}>
            <input
              type="text"
              placeholder="Room title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 mb-3 focus:ring-green-600"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 mb-3 focus:ring-green-600"
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg transition font-medium">
              Create
            </button>
          </form>
        </div>

        {/* My Rooms */}
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">📁 My Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-400 bg-gray-900/50 rounded-xl p-6 text-center border border-gray-800">No rooms yet. Create one or join by ID.</p>
        ) : (
          <div className="grid gap-4">
            {rooms.map(room => (
              <div
                key={room._id}
                onClick={() => joinRoom(room._id)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-gray-600 transition-all hover:shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold">{room.title}</h3>
                  {room.accessCode && <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded">🔒 Private</span>}
                </div>
                {room.description && <p className="text-gray-400 mt-1">{room.description}</p>}
                <p className="text-xs text-gray-500 mt-2">Owner: {room.ownerId?.name || 'Unknown'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;