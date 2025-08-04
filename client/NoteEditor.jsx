import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUpload, FaTimes } from 'react-icons/fa';

export default function NoteEditor({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [color, setColor] = useState(note?.color || '#ffffff');
  const [image, setImage] = useState(note?.image || null);
  const fileInputRef = useRef();

  // Reset states if note changes (for edit mode)
  useEffect(() => {
    setTitle(note?.title || '');
    setBody(note?.body || '');
    setColor(note?.color || '#ffffff');
    setImage(note?.image || null);
  }, [note]);

  const handleImageChange = e => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const removeImage = () => setImage(null);

  const handleSubmit = e => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    onSave({ title, body, color, image });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white rounded shadow max-w-xl mx-auto"
      style={{ backgroundColor: color }}
    >
      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 mb-2 border rounded"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />

      <textarea
        rows={6}
        placeholder="Body (Markdown supported)"
        className="w-full p-2 mb-2 border rounded resize-none"
        value={body}
        onChange={e => setBody(e.target.value)}
      />

      <div className="mb-2 flex items-center gap-2">
        <label htmlFor="colorPicker" className="mr-2 font-semibold">
          Color:
        </label>
        <input
          id="colorPicker"
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-10 h-10 p-0 border rounded cursor-pointer"
        />
      </div>

      <div className="mb-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        <button
          type="button"
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded"
          onClick={() => fileInputRef.current.click()}
        >
          <FaUpload /> {image ? 'Change Image' : 'Add Image'}
        </button>

        {image && (
          <div className="mt-2 relative inline-block">
            {typeof image === 'string' ? (
              <img
                src={image}
                alt="Note"
                className="max-w-xs max-h-40 rounded"
              />
            ) : (
              <img
                src={URL.createObjectURL(image)}
                alt="Note preview"
                className="max-w-xs max-h-40 rounded"
              />
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              title="Remove Image"
            >
              <FaTimes />
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="font-semibold mb-1 block">Preview:</label>
        <div className="p-2 border rounded min-h-[100px] bg-white overflow-auto">
          <ReactMarkdown>{body || 'Nothing to preview...'}</ReactMarkdown>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
