import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanner, SCAN_STATE } from './useScanner'
import ScanResult from './ScanResult'
import ManualFallback from './ManualFallback'

function ScanOptions({ onScan, onUpload, onManual }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Pass file to parent — real OCR processing goes here later
    onUpload(file)
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">

      {/* Upload file option */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center gap-3 px-6 py-8 bg-white border-2 border-dashed border-[#cce4d6] rounded-2xl cursor-pointer hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all group"
      >
        <div className="w-14 h-14 rounded-full bg-[#e8f5ed] flex items-center justify-center group-hover:bg-[#c4e8ce] transition-colors">
          <svg className="w-7 h-7 text-[#3e7a52]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-[#0c1f14]">Upload receipt image</div>
          <div className="text-xs text-[#5a7a68] font-light mt-1">JPG, PNG or PDF — tap to browse</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#e0ede4]" />
        <span className="text-xs text-[#5a7a68]">or</span>
        <div className="flex-1 h-px bg-[#e0ede4]" />
      </div>

      {/* Camera scan option */}
      <div
        onClick={onScan}
        className="flex items-center gap-4 px-5 py-4 bg-white border border-[#cce4d6] rounded-2xl cursor-pointer hover:border-[#5cad76] hover:bg-[#f4fbf6] transition-all group"
      >
        <div className="w-11 h-11 rounded-xl bg-[#e8f5ed] flex items-center justify-center flex-shrink-0 group-hover:bg-[#c4e8ce] transition-colors">
          <svg className="w-5 h-5 text-[#3e7a52]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-[#0c1f14]">Scan with camera</div>
          <div className="text-xs text-[#5a7a68] font-light mt-0.5">Point at QR code or barcode on receipt</div>
        </div>
        <svg className="w-4 h-4 text-[#5a7a68]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
        </svg>
      </div>

      {/* Manual fallback */}
      <button
        onClick={onManual}
        className="w-full py-3 rounded-xl border border-[#cce4d6] text-sm text-[#5a7a68] hover:bg-[#f4fbf6] hover:border-[#5cad76] transition-all"
      >
        Add items manually instead
      </button>

    </div>
  )
}

function CameraViewfinder({ onCancel }) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto w-full">
      <div className="relative w-full aspect-[4/3] bg-[#0c1f14] rounded-2xl overflow-hidden flex items-center justify-center">
        <div className="relative w-56 h-40">
          <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-md" />
          <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-md" />
          <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-md" />
          <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-md" />
          <div className="absolute left-2 right-2 top-1/2 h-[2px] bg-[#5cad76]/80 rounded-full shadow-[0_0_8px_rgba(92,173,118,0.6)]" />
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs">
          Point at QR code or barcode on receipt
        </div>
      </div>
      <button
        onClick={onCancel}
        className="w-full py-3 rounded-xl border border-[#cce4d6] text-sm text-[#5a7a68] hover:bg-[#f4fbf6] transition-all"
      >
        Cancel
      </button>
    </div>
  )
}

function ScanningState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="w-16 h-16 border-4 border-[#e8f5ed] border-t-[#5cad76] rounded-full animate-spin" />
      <div className="text-center">
        <div className="text-base font-medium text-[#0c1f14]">Processing receipt...</div>
        <div className="text-sm text-[#5a7a68] font-light mt-1">Recognising items, please wait</div>
      </div>
    </div>
  )
}

function ImportedState({ count, onGoToFridge, onScanMore }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#e8f5ed] flex items-center justify-center">
        <svg className="w-8 h-8 text-[#5cad76]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
        </svg>
      </div>
      <div>
        <div className="text-lg font-medium text-[#0c1f14]">{count} item{count > 1 ? 's' : ''} added to your fridge!</div>
        <div className="text-sm text-[#5a7a68] font-light mt-1">Your fridge has been updated.</div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={onGoToFridge}
          className="w-full py-3 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors">
          View my fridge
        </button>
        <button onClick={onScanMore}
          className="w-full py-3 rounded-xl border border-[#cce4d6] text-sm text-[#5a7a68] hover:bg-[#f4fbf6] transition-colors">
          Scan another receipt
        </button>
      </div>
    </div>
  )
}

export default function ReceiptScanner() {
  const navigate = useNavigate()
  const {
    scanState, items, checkedIds, editingItem, selectedCount,
    startScan, forceSuccess, reset,
    toggleCheck, updateItem, removeItem, setEditingItem, confirmImport,
  } = useScanner()

  const handleUpload = (file) => {
    // TODO: send file to OCR API
    // For now simulate the same scan flow
    console.log('Uploaded file:', file.name)
    startScan()
  }

  const handleConfirm = () => {
    confirmImport((importedItems) => {
      console.log('Importing to fridge:', importedItems)
    })
  }

  const handleManualAdd = (manualItems) => {
    console.log('Manually adding to fridge:', manualItems)
    confirmImport(() => {})
  }

  return (
    <div className="min-h-screen bg-[#f4fbf6] pt-16">
      <div className="w-full px-4 md:px-8 lg:px-14 py-8 max-w-xl">

        {/* Page header */}
        <div className="mb-8">
          <div className="text-xs font-medium tracking-[1.2px] uppercase text-[#5a7a68] mb-1">Import</div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0c1f14] tracking-tight">Scan Receipt</h1>
          <p className="text-sm text-[#5a7a68] font-light mt-1.5">
            Upload a photo of your receipt or scan the barcode to import items automatically.
          </p>
        </div>

        {scanState === SCAN_STATE.IDLE && (
          <ScanOptions
            onScan={startScan}
            onUpload={handleUpload}
            onManual={forceSuccess}
          />
        )}
        {scanState === SCAN_STATE.SCANNING && <ScanningState />}
        {scanState === SCAN_STATE.SUCCESS && (
          <ScanResult
            items={items} checkedIds={checkedIds} editingItem={editingItem}
            selectedCount={selectedCount} onToggle={toggleCheck} onEdit={setEditingItem}
            onSave={updateItem} onRemove={removeItem} onConfirm={handleConfirm} onRescan={reset}
          />
        )}
        {scanState === SCAN_STATE.FAILED && (
          <ManualFallback onAdd={handleManualAdd} onRescan={reset} />
        )}
        {scanState === SCAN_STATE.IMPORTED && (
          <ImportedState
            count={selectedCount}
            onGoToFridge={() => navigate('/fridge')}
            onScanMore={reset}
          />
        )}
      </div>
    </div>
  )
}