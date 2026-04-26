import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// Auto-detect language from code content (expanded)
const detectLanguage = (code) => {
  if (!code || code.trim() === '') return 'javascript';
  
  const patterns = {
    python: /^\s*(import |from |def |class )|:\s*$/m,
    javascript: /^\s*(const |let |var |function |=>)|console\./m,
    typescript: /^\s*(interface |type |: string|: number|: boolean|: any)/m,
    java: /\bpublic static void main|System\.out\.println\b/,
    cpp: /#include <iostream>|using namespace std|std::/,
    c: /\b#include <stdio\.h>|\bint main\(void\)|\bprintf\b/,
    csharp: /^\s*(using System|namespace|class Program|static void Main)/m,
    go: /^package main|func main\(\)|import \(/m,
    rust: /^\s*(fn main|let mut|println!|impl )/m,
    php: /<\?php|echo |\$[a-zA-Z_]/m,
    ruby: /^def |end\s*$|gem /m,
    dart: /void main\(\)|import 'dart:/m,
    kotlin: /^\s*(fun main|val |var |class )/m,
    swift: /^\s*(import Swift|func |var |let )/m,
    r: /^\s*(library\(|data\.frame|ggplot|function\()/m,
    matlab: /^\s*%|function|end\s*$/m,
    assembly: /^\s*(mov |push |pop |eax|ebx)/mi,
    zig: /const std = @import\("std"\);/m,
    html: /<\s*!DOCTYPE\s+html|\<\s*html|\<\s*body|\<\s*head/mi,
    css: /^\s*[\w\-\.\#]+ *\{.*\}/m,
    sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i,
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) return lang;
  }
  return 'javascript';
};

const Room = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { 
    onlineUsers, 
    joinRoom, 
    leaveRoom, 
    onNewSnippet, 
    onSnippetUpdated, 
    onSnippetDeleted,
    emitNewSnippet, 
    emitUpdateSnippet,
    emitDeleteSnippet
  } = useSocket();
  
  const [room, setRoom] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [editingId, setEditingId] = useState(null);
  
  const [aiReview, setAiReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAccessCode, setEditAccessCode] = useState('');
  
  const snippetsRef = useRef(snippets);
  useEffect(() => { snippetsRef.current = snippets; }, [snippets]);

  useEffect(() => {
    if (code && !editingId) {
      const detected = detectLanguage(code);
      if (detected !== language) setLanguage(detected);
    }
  }, [code, editingId, language]);

  useEffect(() => {
    fetchRoom();
    joinRoom(id);
    
    const unsubscribeNew = onNewSnippet((newSnippet) => {
      if (newSnippet.authorId?._id === user.id) return;
      setSnippets(prev => [newSnippet, ...prev]);
    });
    
    // FIXED: Use string comparison to replace updated snippet (no duplication)
    const unsubscribeUpdate = onSnippetUpdated((updatedSnippet) => {
      if (updatedSnippet.authorId?._id === user.id) return;
      setSnippets(prev =>
        prev.map(s => (String(s._id) === String(updatedSnippet._id) ? updatedSnippet : s))
      );
    });
    
    const unsubscribeDelete = onSnippetDeleted((deletedSnippetId) => {
      setSnippets(prev => prev.filter(s => s._id !== deletedSnippetId));
    });
    
    return () => {
      leaveRoom();
      if (unsubscribeNew) unsubscribeNew();
      if (unsubscribeUpdate) unsubscribeUpdate();
      if (unsubscribeDelete) unsubscribeDelete();
    };
  }, [id]);

  const fetchRoom = async () => {
    try {
      const res = await API.get(`/rooms/${id}`);
      setRoom(res.data.room);
      setSnippets(Array.isArray(res.data.snippets) ? res.data.snippets : []);
    } catch (err) {
      console.error('Failed to fetch room:', err);
      alert(`Error loading room: ${err.response?.data?.message || err.message}`);
    }
  };

  const addSnippet = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      alert('Please write some code before adding a snippet.');
      return;
    }
    const snippetData = {
      roomId: id,
      authorId: user.id,
      title,
      code,
      language
    };
    emitNewSnippet(snippetData);
    const response = await API.post(`/rooms/${id}/snippets`, { title, code, language });
    setSnippets(prev => [response.data, ...prev]);
    setTitle('');
    setCode('');
  };

  const startEdit = (snippet) => {
    setEditingId(snippet._id);
    setTitle(snippet.title);
    setCode(snippet.code);
    setLanguage(snippet.language);
  };

  // FIXED: Use string comparison when updating local state
  const updateSnippet = async (e) => {
    e.preventDefault();
    if (!editingId) {
      alert('No snippet selected for editing. Please try again.');
      return;
    }
    try {
      const response = await API.put(`/rooms/snippets/${editingId}`, {
        title,
        code,
        language
      });
      const updatedSnippet = response.data;
      setSnippets(prev =>
        prev.map(s => (String(s._id) === String(updatedSnippet._id) ? updatedSnippet : s))
      );
      emitUpdateSnippet(editingId, title, code, language);
      setEditingId(null);
      setTitle('');
      setCode('');
      setLanguage('javascript');
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.response?.data?.message || err.message;
      alert(`Failed to update snippet: ${errorMsg}`);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setCode('');
    setLanguage('javascript');
  };

  const deleteSnippet = async (snippetId) => {
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      setSnippets(prev => prev.filter(s => s._id !== snippetId));
      await API.delete(`/rooms/snippets/${snippetId}`);
      emitDeleteSnippet(snippetId);
    }
  };

  const getAIReview = async (snippet) => {
    setSelectedSnippet(snippet);
    setLoadingReview(true);
    setAiReview(null);
    try {
      const res = await API.post('/ai/review', {
        code: snippet.code,
        language: snippet.language
      }, {
        timeout: 60000
      });
      if (res.data && res.data.review) {
        setAiReview(res.data.review);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('AI review error:', err);
      let errorMsg = 'Unknown error';
      
      // Check if the error response contains a review (backend sent mock review)
      if (err.response?.data?.review) {
        setAiReview(err.response.data.review);
        setLoadingReview(false);
        return;
      }
      
      if (err.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. The AI service is slow, please try again.';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setAiReview(`⚠️ AI review failed: ${errorMsg}`);
    } finally {
      setLoadingReview(false);
    }
  };

  // Room edit functions
  const startEditRoom = () => {
    if (!room) return;
    setEditTitle(room.title);
    setEditDescription(room.description || '');
    setEditAccessCode(room.accessCode || '');
    setIsEditingRoom(true);
  };

  const cancelEditRoom = () => {
    setIsEditingRoom(false);
  };

  const saveRoomEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/rooms/${id}`, {
        title: editTitle,
        description: editDescription,
        accessCode: editAccessCode
      });
      setRoom(res.data);
      setIsEditingRoom(false);
    } catch (err) {
      alert('Failed to update room: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteRoomHandler = async () => {
    if (window.confirm('Are you sure you want to delete this room? All snippets will be lost.')) {
      try {
        await API.delete(`/rooms/${id}`);
        window.location.href = '/dashboard';
      } catch (err) {
        alert('Failed to delete room: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  if (!room) return <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center">Loading room...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            {!isEditingRoom ? (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {room.title}
                </h1>
                {room.accessCode && (
                  <span className="bg-yellow-900/50 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-800">
                    🔒 Private
                  </span>
                )}
              </div>
            ) : (
              <form onSubmit={saveRoomEdit} className="bg-gray-900 p-4 rounded-xl border border-gray-700 mb-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full mb-2 text-white focus:ring-blue-600"
                  required
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full mb-2 text-white"
                  rows="2"
                />
                <input
                  type="text"
                  placeholder="Access code (leave empty for public)"
                  value={editAccessCode}
                  onChange={(e) => setEditAccessCode(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full mb-3 text-white"
                />
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                  <button type="button" onClick={cancelEditRoom} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            )}
            {!isEditingRoom && room.ownerId && room.ownerId._id?.toString() === user.id && (
              <div className="inline-flex gap-3 mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <button onClick={startEditRoom} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition">
                  Edit Room
                </button>
                <button onClick={deleteRoomHandler} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition">
                  Delete Room
                </button>
              </div>
            )}
          </div>
          <div className="text-right space-y-2">
            <div className="bg-gray-900 px-3 py-2 rounded-lg border border-gray-800">
              <span className="font-semibold text-gray-300">Online: </span>
              {onlineUsers.map(u => (
                <span key={u.id} className="ml-2 text-green-400">● {u.userId === user.id ? 'You' : u.userId}</span>
              ))}
            </div>
            <div className="bg-gray-900 px-3 py-2 rounded-lg border border-gray-800 text-sm">
              <span className="font-semibold text-gray-300">Online Now:</span> {onlineUsers.length}
            </div>
            <div className="bg-gray-900 px-3 py-2 rounded-lg border border-gray-800 text-sm">
              <span className="font-semibold text-gray-300">Room ID:</span>
              <span className="ml-2 font-mono text-xs text-gray-400">{room._id}</span>
            </div>
          </div>
        </div>
        {!isEditingRoom && room.description && (
          <p className="text-gray-400 mb-6 border-l-4 border-blue-600 pl-4">{room.description}</p>
        )}

        {/* Two‑column layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div>
            <h2 className="text-xl font-semibold mb-3">{editingId ? 'Edit Snippet' : 'Add New Snippet'}</h2>
            <form onSubmit={editingId ? updateSnippet : addSnippet}>
              <input
                type="text"
                placeholder="Snippet title"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 mb-3 focus:ring-blue-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 mb-3 focus:ring-blue-600"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <optgroup label="General-purpose">
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="typescript">TypeScript</option>
                </optgroup>
                <optgroup label="Web / scripting">
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                  <option value="dart">Dart</option>
                </optgroup>
                <optgroup label="Mobile / platform-specific">
                  <option value="kotlin">Kotlin</option>
                  <option value="swift">Swift</option>
                </optgroup>
                <optgroup label="Data / scientific">
                  <option value="r">R</option>
                  <option value="matlab">MATLAB</option>
                </optgroup>
                <optgroup label="Systems / low-level / niche">
                  <option value="assembly">Assembly</option>
                  <option value="zig">Zig</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="sql">SQL</option>
                </optgroup>
              </select>
              <Editor
                height="400px"
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{ minimap: { enabled: false } }}
                className="border border-gray-700 rounded-lg mb-3 overflow-hidden"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-medium">
                  {editingId ? 'Update Snippet' : 'Add Snippet'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-lg">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Snippets list */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Snippets</h2>
            {snippets.length === 0 && (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400 border border-gray-800">
                No snippets yet. Add one above!
              </div>
            )}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scroll">
              {snippets.map((s) => (
                <div key={s._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 transition hover:border-gray-600">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-100">{s.title}</h3>
                    <div>
                      {s.authorId && s.authorId._id && String(s.authorId._id) === String(user.id) && (
                        <>
                          <button onClick={() => startEdit(s)} className="text-blue-400 text-sm hover:underline">Edit</button>
                          <button onClick={() => deleteSnippet(s._id)} className="text-red-400 text-sm ml-2 hover:underline">Delete</button>
                        </>
                      )}
                      <button onClick={() => getAIReview(s)} className="text-purple-400 text-sm ml-2 hover:underline">AI Review</button>
                    </div>
                  </div>
                  <pre className="bg-gray-950 text-gray-200 p-3 rounded-lg text-sm overflow-auto max-h-32 mt-2 border border-gray-800">
                    {s.code}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    {s.language} • by {s.authorId?.name || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Review Modal */}
      {selectedSnippet && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-auto border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-100">AI Review: {selectedSnippet.title}</h3>
              <button onClick={() => { setSelectedSnippet(null); setAiReview(null); }} className="text-gray-400 hover:text-gray-200 text-2xl leading-5">
                ✕
              </button>
            </div>
            {loadingReview && <div className="text-gray-400 text-center py-8">Asking AI to review your code...</div>}
            {aiReview && !loadingReview && (
              <div className="whitespace-pre-wrap bg-gray-800 p-4 rounded-lg text-gray-200">
                {aiReview}
              </div>
            )}
            {!loadingReview && !aiReview && <div className="text-gray-400 text-center py-8">Click AI Review button to start.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;