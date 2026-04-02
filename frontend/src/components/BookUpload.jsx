import React, { useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Image, Book, Calendar, DollarSign, Tag, User, Loader2 } from 'lucide-react';
import api from '../api/axiosClient';

export default function BookUpload({ onUploadSuccess, onCancel }) {
  console.log('🔍 DEBUG: BookUpload component rendered');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // PDF metadata extraction function
  const extractPDFMetadata = async (file) => {
    console.log('🔍 DEBUG: Starting PDF extraction for file:', file.name);
    setExtracting(true);
    setError('');
    
    try {
      // Create a temporary endpoint for PDF processing
      const formData = new FormData();
      formData.append('pdf_file', file);
      
      console.log('🔍 DEBUG: Sending PDF to extraction endpoint');
      const response = await api.post('/api/books/extract-metadata/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('🔍 DEBUG: Extraction response:', response.data);
      
      if (response.data && response.data.metadata) {
        const metadata = response.data.metadata;
        
        // Update form with extracted data
        setFormData(prev => {
          const updated = {
            ...prev,
            title: metadata.title || prev.title,
            subtitle: metadata.subtitle || prev.subtitle,
            author: metadata.author || prev.author,
            pages: metadata.pages || prev.pages,
            language: metadata.language || prev.language,
            description: metadata.description || prev.description,
            isbn: metadata.isbn || prev.isbn,
            publication_date: metadata.publication_date || prev.publication_date,
          };
          console.log('🔍 DEBUG: Form updated with metadata:', updated);
          return updated;
        });
        
        console.log('✅ PDF metadata extracted successfully:', metadata);
      }
    } catch (err) {
      console.warn('⚠️ Could not extract PDF metadata:', err);
      // Don't show error to user, just continue with manual entry
    } finally {
      setExtracting(false);
      console.log('🔍 DEBUG: PDF extraction completed');
    }
  };
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    description: '',
    isbn: '',
    publication_date: '',
    pages: 0,
    language: 'en',
    categories: [],
    price: 0.00,
    is_free: false,
    content_source: 'pdf',
    manual_content: '',
    pdf_file: null,
    cover_image: null,
    cover_url: '',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (name === 'pdf_file') {
        setFormData(prev => ({
          ...prev,
          pdf_file: file
        }));
        
        // Trigger PDF metadata extraction if file is selected
        if (file && file.type === 'application/pdf') {
          extractPDFMetadata(file);
        }
      } else if (name === 'cover_image') {
        setFormData(prev => ({
          ...prev,
          cover_image: file
        }));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'categories') {
      // Handle categories as comma-separated values
      const categories = value.split(',').map(cat => cat.trim()).filter(cat => cat);
      setFormData(prev => ({
        ...prev,
        categories
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 DEBUG: Form submission started', formData);
    setError('');
    setSuccess(false);

    if (!formData.pdf_file && formData.content_source === 'pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a book title');
      return;
    }

    if (!formData.author.trim()) {
      setError('Please enter an author name');
      return;
    }

    console.log('🔍 DEBUG: Validation passed, starting upload');
    setUploading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();
      
      // Basic book info
      data.append('title', formData.title);
      data.append('subtitle', formData.subtitle);
      data.append('author', formData.author);
      data.append('description', formData.description);
      data.append('isbn', formData.isbn);
      data.append('publication_date', formData.publication_date);
      data.append('pages', formData.pages);
      data.append('language', formData.language);
      
      // Categories (send as JSON string)
      data.append('categories', JSON.stringify(formData.categories));
      
      // Pricing
      data.append('price', formData.price);
      data.append('is_free', formData.is_free);
      
      // Content
      data.append('content_source', formData.content_source);
      if (formData.content_source === 'manual') {
        data.append('manual_content', formData.manual_content);
      }
      
      // Files
      if (formData.pdf_file) {
        data.append('pdf_file', formData.pdf_file);
      }
      if (formData.cover_image) {
        data.append('cover_image', formData.cover_image);
      }
      data.append('cover_url', formData.cover_url);

      console.log('🔍 DEBUG: FormData prepared, sending to API');
      console.log('🔍 DEBUG: FormData entries:', Array.from(data.entries()));

      const response = await api.post('/api/books/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      console.log('🔍 DEBUG: Upload successful', response.data);
      setSuccess(true);
      onUploadSuccess?.(response.data);
      
      // Reset form after successful upload
      setTimeout(() => {
        setFormData({
          title: '',
          subtitle: '',
          author: '',
          description: '',
          isbn: '',
          publication_date: '',
          pages: 0,
          language: 'en',
          categories: [],
          price: 0.00,
          is_free: false,
          content_source: 'pdf',
          manual_content: '',
          pdf_file: null,
          cover_image: null,
          cover_url: '',
        });
        setSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Failed to upload book');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Upload New Book</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Successful!</h3>
              <p className="text-gray-600">Your book has been uploaded successfully.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Content Source Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Source
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="content_source"
                      value="pdf"
                      checked={formData.content_source === 'pdf'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <FileText size={16} className="mr-1" />
                    PDF File
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="content_source"
                      value="manual"
                      checked={formData.content_source === 'manual'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <Book size={16} className="mr-1" />
                    Manual Entry
                  </label>
                </div>
              </div>

              {/* PDF File Upload */}
              {formData.content_source === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleInputChange}
                      className="hidden"
                      id="pdf-upload"
                      name="pdf_file"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      {extracting ? (
                        <div className="space-y-3">
                          <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                          <p className="text-sm text-blue-600 mb-1">
                            Extracting PDF metadata...
                          </p>
                          <p className="text-xs text-gray-500">Please wait while we analyze your PDF</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF files only (auto-extracts metadata)</p>
                        </div>
                      )}
                      {formData.pdf_file && !extracting && (
                        <div className="mt-3 flex items-center justify-center text-sm text-green-600">
                          <FileText size={16} className="mr-1" />
                          {formData.pdf_file.name}
                          <span className="ml-2 text-xs text-green-500">
                            ✓ Metadata extracted
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="hidden"
                    id="cover-upload"
                    name="cover_image"
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload cover image
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG, GIF files</p>
                    {formData.cover_image && (
                      <div className="mt-3 flex items-center justify-center text-sm text-green-600">
                        <Image size={16} className="mr-1" />
                        {formData.cover_image.name}
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Book Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter book title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author *
                  </label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter author name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter subtitle (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ISBN (optional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter book description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={16} className="inline mr-1" />
                    Publication Date
                  </label>
                  <input
                    type="date"
                    name="publication_date"
                    value={formData.publication_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pages
                  </label>
                  <input
                    type="number"
                    name="pages"
                    value={formData.pages}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Number of pages"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={16} className="inline mr-1" />
                  Categories
                </label>
                <input
                  type="text"
                  name="categories"
                  value={formData.categories.join(', ')}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter categories separated by commas (e.g., Fiction, Romance, Mystery)"
                />
              </div>

              {/* Manual Content */}
              {formData.content_source === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Content *
                  </label>
                  <textarea
                    name="manual_content"
                    value={formData.manual_content}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste or type the book content here..."
                    required
                  />
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign size={16} className="inline mr-1" />
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_free"
                    id="is_free"
                    checked={formData.is_free}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_free" className="ml-2 text-sm text-gray-700">
                    Free Book
                  </label>
                </div>
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover URL (alternative to upload)
                </label>
                <input
                  type="url"
                  name="cover_url"
                  value={formData.cover_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => console.log('🔍 DEBUG: Current form data:', formData)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Debug Form
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Book'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
