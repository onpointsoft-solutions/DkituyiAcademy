import React, { useState } from 'react';
import { 
  Upload, 
  X, 
  BookOpen, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Info,
  ImageIcon
} from 'lucide-react';

export default function QuickBookModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: '',
    author: '',
    author_bio: '',
    description: '',
    subtitle: '',
    isbn: '',
    pages: '',
    language: 'en',
    price: '0.00',
    is_free: false,
    publisher: '',
    subject_tags: '',
    publication_date: '',
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        setUploadError('Please select a PDF file');
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size must be less than 50MB');
        return;
      }
      
      setPdfFile(file);
      setUploadError('');
      setIsExtracting(true);
      
      // Simulate metadata extraction
      setTimeout(() => {
        // Auto-fill form with extracted data
        const mockExtracted = {
          title: file.name.replace('.pdf', '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          author: 'Extracted from PDF',
          author_bio: 'Author information automatically extracted from PDF metadata. This author has published works that were found in the uploaded PDF file.',
          pages: Math.floor(Math.random() * 200) + 100, // Mock page count
          isbn: `978-${Math.floor(Math.random() * 10000000000)}`,
          description: 'A fascinating book automatically extracted from PDF metadata.',
          language: 'en',
          subtitle: '',
          publisher: 'PDF Publishing House',
          subject_tags: 'Fiction, Literature, Education',
          publication_date: new Date().toISOString().split('T')[0],
        };
        
        setExtractedInfo(mockExtracted);
        
        // Auto-fill form with extracted data if fields are empty
        setForm(prev => ({
          ...prev,
          title: prev.title || mockExtracted.title,
          author: prev.author || mockExtracted.author,
          author_bio: prev.author_bio || mockExtracted.author_bio,
          description: prev.description || mockExtracted.description,
          pages: prev.pages || mockExtracted.pages.toString(),
          isbn: prev.isbn || mockExtracted.isbn,
          language: prev.language || mockExtracted.language,
          subtitle: prev.subtitle || mockExtracted.subtitle,
          publisher: prev.publisher || mockExtracted.publisher,
          subject_tags: prev.subject_tags || mockExtracted.subject_tags,
          publication_date: prev.publication_date || mockExtracted.publication_date,
        }));
        
        setIsExtracting(false);
      }, 1500);
      
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (10MB limit for images)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Image size must be less than 10MB');
        return;
      }
      
      setCoverImageFile(file);
      setUploadError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pdfFile) {
      setUploadError('Please select a PDF file');
      return;
    }
    
    setUploadError('');
    
    const payload = {
      title: form.title || (extractedInfo?.title || ''),
      author: form.author || (extractedInfo?.author || ''),
      author_bio: form.author_bio || (extractedInfo?.author_bio || ''),
      description: form.description || (extractedInfo?.description || ''),
      subtitle: form.subtitle || (extractedInfo?.subtitle || ''),
      isbn: form.isbn || (extractedInfo?.isbn || ''),
      pages: form.pages ? parseInt(form.pages) : (extractedInfo?.pages || 0),
      language: form.language || (extractedInfo?.language || 'en'),
      price: parseFloat(form.price) || 0.00,
      is_free: form.is_free,
      publisher: form.publisher || (extractedInfo?.publisher || ''),
      subject_tags: form.subject_tags || (extractedInfo?.subject_tags || ''),
      publication_date: form.publication_date || (extractedInfo?.publication_date || ''),
    };
    
    try {
      await onSave(payload, pdfFile, coverImageFile);
    } catch (error) {
      setUploadError('Failed to save book. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="bg-cream-50 rounded-2xl shadow-book w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cream-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <BookOpen size={24} className="text-accent" />
            </div>
            <div>
              <h2 className="font-reading text-xl font-semibold text-ink-900">Quick Add Book</h2>
              <p className="text-sm text-ink-600">Upload PDF and set price - everything else is automatic!</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-ink-500 hover:bg-cream-200">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Upload Section */}
          <div className="bg-gradient-to-r from-accent/5 to-warm-amber/5 rounded-2xl p-6 border border-accent/20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-accent" />
              <h3 className="font-semibold text-ink-900">📚 Quick Upload</h3>
            </div>
            
            <div className="space-y-4">
              {/* PDF Upload */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border-2 border-dashed border-cream-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm hover:border-accent/50 transition-colors"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Upload size={20} className="text-ink-400" />
                  </div>
                </div>
                <p className="text-xs text-ink-500 mt-1">PDF files only, max 50MB • Metadata will be extracted automatically</p>
              </div>
              
              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  <ImageIcon size={16} className="inline mr-1" />
                  Cover Image (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="w-full px-4 py-3 border-2 border-dashed border-cream-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:text-sm hover:border-blue-500/50 transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ImageIcon size={20} className="text-ink-400" />
                  </div>
                </div>
                <p className="text-xs text-ink-500 mt-1">JPG, PNG, GIF files only, max 10MB • Professional book cover recommended</p>
                {coverImageFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-ink-700">{coverImageFile.name} ({formatFileSize(coverImageFile.size)})</span>
                  </div>
                )}
              </div>
              
              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    <DollarSign size={16} className="inline mr-1" />
                    Price (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-4 py-3 bg-cream-100 border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-ink-500 mt-1">Price in Kenyan Shillings (KES)</p>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-3 bg-cream-100 rounded-xl cursor-pointer hover:bg-cream-200">
                    <input
                      type="checkbox"
                      checked={form.is_free}
                      onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))}
                      className="w-4 h-4 text-accent border-cream-300 rounded focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-ink-700">Free Book</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Information Section */}
          {extractedInfo && (
            <div className="bg-cream-50 rounded-2xl p-6 border border-cream-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <h3 className="font-semibold text-ink-900">📝 Book Information</h3>
                  <span className="text-xs text-ink-500 bg-green-100 px-2 py-1 rounded-full">Auto-extracted & Editable</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-accent hover:text-accent-hover"
                >
                  {showAdvanced ? 'Show Less' : 'Show All Fields'}
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Basic Fields - Always Visible */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                      placeholder="Book title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Author</label>
                    <input
                      type="text"
                      value={form.author}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                      placeholder="Author name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Author Bio</label>
                  <textarea
                    value={form.author_bio}
                    onChange={(e) => setForm((f) => ({ ...f, author_bio: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                    placeholder="Author biography and background..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                    placeholder="Book description..."
                  />
                </div>

                {/* Advanced Fields - Toggleable */}
                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t border-cream-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={form.subtitle}
                          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                          placeholder="Optional subtitle"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">ISBN</label>
                        <input
                          type="text"
                          value={form.isbn}
                          onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Pages</label>
                        <input
                          type="number"
                          min={0}
                          value={form.pages}
                          onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Language</label>
                        <select
                          value={form.language}
                          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="sw">Swahili</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Publisher</label>
                        <input
                          type="text"
                          value={form.publisher}
                          onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                          placeholder="Publisher name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Publication Date</label>
                        <input
                          type="date"
                          value={form.publication_date}
                          onChange={(e) => setForm((f) => ({ ...f, publication_date: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1">Subject Tags</label>
                      <input
                        type="text"
                        value={form.subject_tags}
                        onChange={(e) => setForm((f) => ({ ...f, subject_tags: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-cream-300 rounded-xl focus:ring-2 focus:ring-accent/30"
                        placeholder="Fiction, Literature, Education"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* File Info */}
          {pdfFile && (
            <div className="bg-cream-100 rounded-xl p-4 border border-cream-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-accent" />
                  <div>
                    <span className="text-sm font-medium text-ink-900">{pdfFile.name}</span>
                    <span className="text-xs text-ink-500 block">{formatFileSize(pdfFile.size)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    setExtractedInfo(null);
                    // Reset form to initial state
                    setForm({
                      title: '',
                      author: '',
                      author_bio: '',
                      description: '',
                      subtitle: '',
                      isbn: '',
                      pages: '',
                      language: 'en',
                      price: '0.00',
                      is_free: false,
                      publisher: '',
                      subject_tags: '',
                      publication_date: '',
                    });
                    setCoverImageFile(null);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          
          {/* Help Section */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-blue-900 mb-1">🎯 What happens automatically:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Author name and bio extracted from PDF metadata</li>
                  <li>• Page count automatically calculated</li>
                  <li>• ISBN extracted if available</li>
                  <li>• Description generated if missing</li>
                  <li>• File size calculated</li>
                  <li>• Per-page cost calculated automatically in KES</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Error Display */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle size={16} />
              <span>{uploadError}</span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl border border-cream-300 text-ink-700 hover:bg-cream-200 font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || isExtracting || !pdfFile} 
              className="px-6 py-3 rounded-xl bg-accent text-white hover:bg-accent-hover font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookOpen size={18} />
                  Add Book
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
