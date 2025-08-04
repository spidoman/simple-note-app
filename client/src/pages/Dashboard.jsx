import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', color: '' });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await API.get('/me');
        setUser(userRes.data);
      } catch {
        alert('Authentication error. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      try {
        const notesRes = await API.get('/notes');
        setNotes(notesRes.data);
      } catch {
        alert('Failed to fetch notes.');
      }
    }
    fetchData();
  }, [navigate]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = e => setImageFile(e.target.files[0] || null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('body', form.body);
      formData.append('color', form.color);
      if (imageFile) formData.append('image', imageFile);

      if (editingId) {
        await API.put(`/notes/${editingId}`, formData);
        setEditingId(null);
      } else {
        await API.post('/notes', formData);
      }

      const notesRes = await API.get('/notes');
      setNotes(notesRes.data);
      setForm({ title: '', body: '', color: '' });
      setImageFile(null);
    } catch {
      alert('Error saving note');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await API.delete(`/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch {
      alert('Failed to delete note.');
    }
  };

  const handleEdit = note => {
    setForm({ title: note.title || '', body: note.body || '', color: note.color || '' });
    setEditingId(note.id);
    setImageFile(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Pin/Unpin note
  const togglePin = async (note) => {
    try {
      await API.put(`/notes/${note.id}/pin`, { pinned: !note.pinned });
      const notesRes = await API.get('/notes');
      setNotes(notesRes.data);
    } catch {
      alert('Failed to toggle pin.');
    }
  };

  // Archive/Unarchive note
  const toggleArchive = async (note) => {
    try {
      await API.put(`/notes/${note.id}/archive`, { archived: !note.archived });
      const notesRes = await API.get('/notes');
      setNotes(notesRes.data);
    } catch {
      alert('Failed to toggle archive.');
    }
  };

  if (!user) return <p className="text-center mt-10 text-lg">Loading...</p>;

  // Separate pinned, unpinned, archived notes
  const pinnedNotes = notes.filter(n => n.pinned && !n.archived);
  const unpinnedNotes = notes.filter(n => !n.pinned && !n.archived);
  const archivedNotes = notes.filter(n => n.archived);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center space-x-4">
          <img
            src={
              user.profileImage
                ? `http://localhost:5000/uploads/${user.profileImage}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&rounded=true`
            }
            alt="Profile"
            className="w-14 h-14 rounded-full border shadow-sm"
          />
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md shadow transition"
          title="Logout"
          aria-label="Logout"
        >
          Logout
        </button>
      </header>

      {/* Note Form */}
      <section className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Note' : 'Create a New Note'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <input
            name="title"
            value={form.title || ''}
            onChange={handleChange}
            placeholder="Title"
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            name="body"
            value={form.body || ''}
            onChange={handleChange}
            placeholder="Body"
            rows={3}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="color"
            value={form.color || ''}
            onChange={handleChange}
            placeholder="Color (e.g. #FFDD57)"
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="w-full"
          />
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              {editingId ? 'Update Note' : 'Create Note'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ title: '', body: '', color: '' });
                  setImageFile(null);
                }}
                className="text-gray-600 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-2">📌 Pinned Notes</h3>
          <div className="space-y-4">
            {pinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={() => handleDelete(note.id)}
                onTogglePin={() => togglePin(note)}
                onToggleArchive={() => toggleArchive(note)}
                onView={setViewingNote}
              />
            ))}
          </div>
        </section>
      )}

      {/* Unpinned Notes */}
      <section>
        <h3 className="text-xl font-bold mb-2">Notes</h3>
        {unpinnedNotes.length > 0 ? (
          <div className="space-y-4">
            {unpinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={() => handleDelete(note.id)}
                onTogglePin={() => togglePin(note)}
                onToggleArchive={() => toggleArchive(note)}
                onView={setViewingNote}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No notes yet. Start by creating one above.</p>
        )}
      </section>

      {/* Archived Notes Toggle */}
      <section>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="mt-6 text-sm text-blue-600 hover:underline"
        >
          {showArchived ? 'Hide Archived Notes' : 'Show Archived Notes'}
        </button>

        {showArchived && (
          <div className="mt-4 space-y-4">
            {archivedNotes.length > 0 ? (
              archivedNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEdit}
                  onDelete={() => handleDelete(note.id)}
                  onTogglePin={() => togglePin(note)}
                  onToggleArchive={() => toggleArchive(note)}
                  onView={setViewingNote}
                />
              ))
            ) : (
              <p className="text-center text-gray-500">No archived notes.</p>
            )}
          </div>
        )}
      </section>

      {/* Navigation */}
      <footer className="mt-8 text-center space-x-6">
        <Link to="/" className="text-blue-600 hover:underline">
          Home
        </Link>
        <Link to="/profile" className="text-blue-600 hover:underline">
          Profile
        </Link>
      </footer>

      {/* Note View Modal */}
      {viewingNote && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setViewingNote(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2">{viewingNote.title}</h2>
            <p className="mb-4 whitespace-pre-wrap">{viewingNote.body || 'No content'}</p>
            {viewingNote.color && (
              <div
                className="inline-block px-3 py-1 mb-4 rounded text-white"
                style={{ backgroundColor: viewingNote.color }}
              >
                {viewingNote.color}
              </div>
            )}
            {viewingNote.image && (
              <img
                src={`http://localhost:5000/uploads/note/${viewingNote.image}`}
                alt="Note Attachment"
                className="rounded border max-w-full mb-4"
              />
            )}
            <button
              onClick={() => setViewingNote(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Note card component
function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleArchive, onView }) {
  return (
    <article className="bg-white p-5 rounded-xl shadow border flex justify-between items-start">
      <div>
        <h3 className="text-lg font-bold">{note.title}</h3>
        <p className="text-sm text-gray-700 mt-1">
          {note.body?.slice(0, 100)}
          {note.body?.length > 100 ? '...' : ''}
        </p>
        {note.color && (
          <span
            className="inline-block px-3 py-1 mt-2 rounded text-white shadow"
            style={{ backgroundColor: note.color }}
          >
            {note.color}
          </span>
        )}
        {note.image && (
          <img
            src={`http://localhost:5000/uploads/note/${note.image}`}
            alt="Note Attachment"
            className="mt-3 w-40 rounded border"
          />
        )}
      </div>
      <div className="space-x-3 text-right flex flex-col gap-1">
        <button
          onClick={onTogglePin}
          className={`text-sm font-semibold hover:underline ${
            note.pinned ? 'text-yellow-500' : 'text-gray-600'
          }`}
          title={note.pinned ? 'Unpin Note' : 'Pin Note'}
        >
          {note.pinned ? '📌 Unpin' : '📍 Pin'}
        </button>
        <button
          onClick={onToggleArchive}
          className={`text-sm font-semibold hover:underline ${
            note.archived ? 'text-gray-500 line-through' : 'text-gray-600'
          }`}
          title={note.archived ? 'Unarchive Note' : 'Archive Note'}
        >
          {note.archived ? '🗄️ Unarchive' : '🗄️ Archive'}
        </button>
        <button onClick={onView} className="text-green-600 hover:underline text-sm">
          View
        </button>
        <button onClick={onEdit} className="text-blue-600 hover:underline text-sm">
          Edit
        </button>
        <button onClick={onDelete} className="text-red-600 hover:underline text-sm">
          Delete
        </button>
      </div>
    </article>
  );
}
