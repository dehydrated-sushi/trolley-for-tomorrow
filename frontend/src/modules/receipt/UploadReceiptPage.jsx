import { useState } from 'react'

export default function UploadReceiptPage() {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [responseData, setResponseData] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    setMessage('')
    setResponseData(null)
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a receipt image first.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setLoading(true)
      setMessage('')
      setResponseData(null)

      const response = await fetch('http://127.0.0.1:5000/api/receipts/upload', {
        method: 'POST',
        body: formData,
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      console.log('Backend response:', data)

      if (!response.ok) {
        setMessage(data.error || `Upload failed. Status: ${response.status}`)
        return
      }

      setResponseData(data)
      setMessage(data.message || 'Upload successful.')
    } catch (error) {
      setMessage(`Something went wrong while uploading: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        background: '#052e1b',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Upload Receipt</h1>
      <p>Select a receipt image and send it to the backend.</p>

      <div style={{ marginTop: '1.5rem' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{
            display: 'block',
            marginBottom: '16px',
            background: 'white',
            color: 'black',
            padding: '10px',
            borderRadius: '8px',
          }}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          type="button"
          style={{
            backgroundColor: '#65d18a',
            color: '#062814',
            border: 'none',
            padding: '12px 22px',
            borderRadius: '999px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Uploading...' : 'Upload Receipt'}
        </button>
      </div>

      {file && (
        <p style={{ marginTop: '1rem' }}>
          <strong>Selected file:</strong> {file.name}
        </p>
      )}

      {message && (
        <p style={{ marginTop: '1rem' }}>
          {message}
        </p>
      )}

      {responseData && (
        <div style={{ marginTop: '1.5rem' }}>
          <p><strong>Filename:</strong> {responseData.filename || 'Not returned by backend'}</p>
          <p><strong>Saved path:</strong> {responseData.filepath || 'Not returned by backend'}</p>
        </div>
      )}

      {responseData?.raw_lines && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>OCR Lines</h3>
          {responseData.raw_lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      {responseData?.raw_text && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Raw OCR Text</h3>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#0b3d27',
              padding: '12px',
              borderRadius: '8px',
            }}
          >
            {responseData.raw_text}
          </pre>
        </div>
      )}

      {responseData && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Debug Response</h3>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#0b3d27',
              padding: '12px',
              borderRadius: '8px',
            }}
          >
            {JSON.stringify(responseData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}