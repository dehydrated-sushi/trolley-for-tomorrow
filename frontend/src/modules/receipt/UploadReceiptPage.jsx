import { useState } from 'react'
import { API_BASE } from '../../lib/api'

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

      const response = await fetch(`${API_BASE}/api/receipts/upload`, {
        method: 'POST',
        body: formData,
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

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

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}

      {responseData?.items?.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Saved Items</h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#0b3d27',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Qty</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {responseData.items.map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td style={{ padding: '10px', borderTop: '1px solid #1b5a3d' }}>{item.name}</td>
                  <td style={{ padding: '10px', borderTop: '1px solid #1b5a3d' }}>{item.qty ?? 1}</td>
                  <td style={{ padding: '10px', borderTop: '1px solid #1b5a3d' }}>
                    {item.price != null ? `$${item.price}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}