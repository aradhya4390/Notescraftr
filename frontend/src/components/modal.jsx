import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { jsPDF } from 'jspdf';

const modalStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
};

const contentStyle = {
  width: '100%',
  maxWidth: '680px',
  background: '#fff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)',
  position: 'relative',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeButtonStyle = {
  position: 'absolute',
  top: '18px',
  right: '18px',
  background: 'transparent',
  border: 'none',
  fontSize: '22px',
  cursor: 'pointer',
  color: '#374151'
};

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #d1d5db',
  marginBottom: '16px',
  fontSize: '14px',
};

const buttonStyle = {
  border: 'none',
  borderRadius: '10px',
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 600,
};

const sectionHeaderStyle = {
  marginBottom: '14px',
  color: '#111827',
  fontSize: '18px',
};

const cardButtonStyle = {
  ...buttonStyle,
  background: '#f8fafc',
  color: '#111827',
  border: '1px solid #d1d5db',
  width: '100%',
  textAlign: 'left',
};

const CreateNoteModal = ({
  isOpen,
  onClose,
  title,
  content,
  selectedTag,
  noteCategory,
  availableTags,
  availableCategories,
  onTitleChange,
  onContentChange,
  onTagChange,
  onCategoryChange,
  onSubmit,
  onCancelEdit,
  editingNote,
  isLoading,
  showAIFeatures,
  setShowAIFeatures,
  aiTopic,
  setAiTopic,
  onGenerateAI,
  isGeneratingAI,
  apiUrl,
  onActionComplete
}) => {
  const [mode, setMode] = useState('menu');
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  const resetModalState = useCallback(() => {
    setMode('menu');
    setFile(null);
    setUploadError('');
    setUploadStatus('');
    setCameraError('');
    setCapturedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsProcessing(false);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen, resetModalState]);

  const handleOverlayClick = () => {
    handleCloseClick();
  };

  const handleCloseClick = () => {
    onCancelEdit();
    resetModalState();
    onClose();
  };

  const handleBack = () => {
    if (mode === 'camera') {
      stopCamera();
    }
    setMode('menu');
    setUploadError('');
    setUploadStatus('');
    setCapturedImage(null);
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setUploadError('Please choose a valid PDF file.');
      setFile(null);
      return;
    }
    setFile(selected);
    setUploadError('');
    setUploadStatus('');
  };

  const uploadPDF = async (fileToUpload, fileName) => {
    setUploadError('');
    setUploadStatus('Uploading file...');
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', fileToUpload, fileName);

      const response = await axios.post(`${apiUrl}/upload/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.success) {
        setUploadStatus('PDF uploaded successfully.');
        onActionComplete?.();
        setTimeout(() => {
          resetModalState();
          onClose();
        }, 700);
      } else {
        setUploadError(response.data?.message || 'Upload failed.');
      }
    } catch (error) {
      setUploadError(error?.response?.data?.message || 'Upload failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadFile = async () => {
    if (!file) {
      setUploadError('Select a PDF file first.');
      return;
    }
    await uploadPDF(file, file.name);
  };

  const startCamera = async () => {
    setCameraError('');
    setCapturedImage(null);
    setCroppedAreaPixels(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setMode('camera');
    } catch (error) {
      setCameraError('Unable to access camera. Allow permissions and try again.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setMode('crop');
    stopCamera();
  };

  const onCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedBlob = async (imageSrc, cropPixels) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
    });
  };

  const convertImageToPdfBlob = async (imageBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const pdf = new jsPDF('p', 'pt', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
          const imgWidth = img.width * ratio;
          const imgHeight = img.height * ratio;
          const x = (pageWidth - imgWidth) / 2;

          pdf.addImage(img, 'JPEG', x, 20, imgWidth, imgHeight);
          const blob = pdf.output('blob');
          resolve(blob);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  };

  const handleSaveCroppedImageAsPDF = async () => {
    if (!capturedImage || !croppedAreaPixels) {
      setUploadError('Crop the image before saving.');
      return;
    }

    setUploadError('');
    setUploadStatus('Converting image to PDF...');
    setIsProcessing(true);

    try {
      const croppedBlob = await getCroppedBlob(capturedImage, croppedAreaPixels);
      const pdfBlob = await convertImageToPdfBlob(croppedBlob);
      await uploadPDF(pdfBlob, `camera-capture-${Date.now()}.pdf`);
    } catch (error) {
      setUploadError('Unable to convert and upload the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const renderCreateSection = () => (
    <>
      <h2 style={{ marginBottom: '10px', color: '#111827' }}>
        {editingNote ? 'Edit Note' : 'Create Note'}
      </h2>
      <p style={{ marginBottom: '24px', color: '#4b5563' }}>
        Use this modal to add a new note or update an existing one.
      </p>

      <input
        style={fieldStyle}
        type="text"
        placeholder="Enter note title..."
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />

      <textarea
        style={{ ...fieldStyle, minHeight: '140px', resize: 'vertical' }}
        placeholder="Write your thoughts here..."
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />

      <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
        <select
          style={fieldStyle}
          value={selectedTag}
          onChange={(e) => onTagChange(e.target.value)}
        >
          <option value="">Select Tag</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        <select
          style={fieldStyle}
          value={noteCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          style={{
            ...buttonStyle,
            background: showAIFeatures ? '#4338ca' : '#e5e7eb',
            color: showAIFeatures ? '#fff' : '#111827',
            marginBottom: '14px'
          }}
          onClick={() => setShowAIFeatures(!showAIFeatures)}
        >
          {showAIFeatures ? 'Hide AI Creation' : 'Show AI Creation'}
        </button>

        {showAIFeatures && (
          <div style={{ marginTop: '16px' }}>
            <input
              style={fieldStyle}
              type="text"
              placeholder="Enter AI topic (e.g., Physics Motion, History World War)"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
            <button
              type="button"
              onClick={onGenerateAI}
              disabled={isGeneratingAI}
              style={{
                ...buttonStyle,
                width: '100%',
                background: isGeneratingAI ? '#818cf8' : '#4f46e5',
                color: '#fff'
              }}
            >
              {isGeneratingAI ? 'Generating AI...' : 'Generate AI Notes'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          style={{
            ...buttonStyle,
            background: '#3b82f6',
            color: '#fff',
            minWidth: '140px'
          }}
        >
          {isLoading ? 'Saving...' : editingNote ? 'Update Note' : 'Create Note'}
        </button>
        <button
          type="button"
          onClick={handleCloseClick}
          style={{
            ...buttonStyle,
            background: '#f3f4f6',
            color: '#111827',
            minWidth: '140px'
          }}
        >
          Cancel
        </button>
      </div>
    </>
  );

  const renderUploadSection = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={sectionHeaderStyle}>Upload a PDF</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Choose a PDF file and save it to your account.
          </p>
        </div>
        <button type="button" style={{ ...buttonStyle, background: '#e5e7eb', color: '#111827' }} onClick={handleBack}>
          ← Back
        </button>
      </div>

      <input type="file" accept="application/pdf" style={fieldStyle} onChange={handleFileChange} />
      {file && (
        <div style={{ marginBottom: '16px', color: '#111827' }}>
          <strong>Selected file:</strong> {file.name}
        </div>
      )}
      {uploadError && <p style={{ color: '#b91c1c', marginBottom: '16px' }}>{uploadError}</p>}
      {uploadStatus && <p style={{ color: '#047857', marginBottom: '16px' }}>{uploadStatus}</p>}

      <button
        type="button"
        onClick={handleUploadFile}
        disabled={isProcessing}
        style={{
          ...buttonStyle,
          background: '#2563eb',
          color: '#fff',
          width: '100%'
        }}
      >
        {isProcessing ? 'Uploading...' : 'Upload PDF'}
      </button>
    </>
  );

  const renderCameraSection = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={sectionHeaderStyle}>Capture from Camera</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Take a photo, crop it, then save it as a PDF.
          </p>
        </div>
        <button type="button" style={{ ...buttonStyle, background: '#e5e7eb', color: '#111827' }} onClick={handleBack}>
          ← Back
        </button>
      </div>

      {mode === 'camera' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: '14px', background: '#000' }}
            />
          </div>
          {cameraError && <p style={{ color: '#b91c1c', marginBottom: '16px' }}>{cameraError}</p>}
          <button
            type="button"
            onClick={capturePhoto}
            style={{
              ...buttonStyle,
              background: '#10b981',
              color: '#fff',
              width: '100%'
            }}
          >
            Capture Photo
          </button>
        </>
      )}

      {mode === 'menu' && (
        <button
          type="button"
          onClick={startCamera}
          style={{
            ...buttonStyle,
            background: '#10b981',
            color: '#fff',
            width: '100%'
          }}
        >
          Start Camera
        </button>
      )}

      {mode === 'crop' && capturedImage && (
        <>
          <div style={{ position: 'relative', height: '360px', background: '#111827', marginBottom: '16px' }}>
            <Cropper
              image={capturedImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          {uploadError && <p style={{ color: '#b91c1c', marginBottom: '16px' }}>{uploadError}</p>}
          {uploadStatus && <p style={{ color: '#047857', marginBottom: '16px' }}>{uploadStatus}</p>}
          <button
            type="button"
            onClick={handleSaveCroppedImageAsPDF}
            disabled={isProcessing}
            style={{
              ...buttonStyle,
              background: '#2563eb',
              color: '#fff',
              width: '100%'
            }}
          >
            {isProcessing ? 'Saving PDF...' : 'Save as PDF'}
          </button>
        </>
      )}
    </>
  );

  const renderMenu = () => (
    <>
      <h2 style={{ marginBottom: '10px', color: '#111827' }}>
        New Note Options
      </h2>
      <p style={{ marginBottom: '24px', color: '#4b5563' }}>
        Choose how you want to create notes: type one manually, upload a PDF, or capture from your camera.
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <button
          type="button"
          style={cardButtonStyle}
          onClick={() => setMode('create')}
        >
          <strong>Create note manually</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Start a new note with title, content, tags, and AI assistance.</p>
        </button>

        <button
          type="button"
          style={cardButtonStyle}
          onClick={() => setMode('upload')}
        >
          <strong>Upload PDF</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Upload an existing PDF and store it securely.</p>
        </button>

        <button
          type="button"
          style={cardButtonStyle}
          onClick={startCamera}
        >
          <strong>Capture from camera</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Take a photo, crop it, then save it as a PDF.</p>
        </button>
      </div>

      <button
        type="button"
        onClick={handleCloseClick}
        style={{
          ...buttonStyle,
          background: '#f3f4f6',
          color: '#111827',
          marginTop: '22px',
          width: '100%'
        }}
      >
        Cancel
      </button>
    </>
  );

  return (
    <div style={modalStyle} onClick={handleOverlayClick}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeButtonStyle} onClick={handleCloseClick} aria-label="Close modal">
          ×
        </button>
        {mode === 'menu' && renderMenu()}
        {mode === 'create' && renderCreateSection()}
        {mode === 'upload' && renderUploadSection()}
        {mode === 'camera' && renderCameraSection()}
        {mode === 'crop' && renderCameraSection()}
      </div>
    </div>
  );
};

export default CreateNoteModal;
