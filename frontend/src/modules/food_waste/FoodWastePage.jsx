import { useState } from 'react'
import { API_BASE } from '../../lib/api'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

function formatPercent(value) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A'
}

export default function FoodWastePage() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null
    setResult(null)
    setError('')

    if (!selectedFile) {
      setFile(null)
      setPreviewUrl('')
      return
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension || '')) {
      setFile(null)
      setPreviewUrl('')
      setError('Please upload a JPG, JPEG, PNG, or WEBP image.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setPreviewUrl('')
      setError('The image is too large. Please keep it under 10MB.')
      return
    }

    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Choose an image first.')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/food-waste/predict`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Prediction failed.')
      }

      setResult(data)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="px-4 pb-10 pt-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(134,216,157,0.55),_transparent_30%),linear-gradient(135deg,_#f5fff7_0%,_#e8f5eb_45%,_#ffffff_100%)] p-8 editorial-shadow">
          <p className="mb-3 inline-flex rounded-full bg-white/80 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">
            Trolleyy AI Waste Check
          </p>
          <h1 className="max-w-3xl font-headline text-4xl font-extrabold tracking-tight text-emerald-950 sm:text-5xl">
            Upload a plate photo and estimate how much food is left.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-900/75 sm:text-lg">
            This page sends the image to your YOLO segmentation model, measures the visible food area,
            and returns a simple waste estimate with an annotated preview.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-emerald-100 bg-white p-6 editorial-shadow">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline text-2xl font-bold text-emerald-950">Test the model</h2>
                <p className="mt-2 text-sm text-emerald-900/70">
                  Supported formats: JPG, JPEG, PNG, WEBP. Maximum size: 10MB.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Endpoint
                </div>
                <div className="mt-1 text-sm font-semibold text-emerald-950">
                  /api/food-waste/predict
                </div>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label
                htmlFor="food-waste-image"
                className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-emerald-300 bg-emerald-50/70 px-6 py-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected upload"
                    className="max-h-72 rounded-[1.5rem] object-cover shadow-lg"
                  />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-6xl text-emerald-700">
                      add_a_photo
                    </span>
                    <span className="mt-4 font-headline text-2xl font-bold text-emerald-950">
                      Choose a meal photo
                    </span>
                    <span className="mt-2 max-w-md text-sm leading-6 text-emerald-900/70">
                      Take a top-down or near top-down photo of the plate for the best segmentation result.
                    </span>
                  </>
                )}
              </label>

              <input
                id="food-waste-image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full hero-gradient px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? 'Running prediction...' : 'Estimate food waste'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPreviewUrl('')
                    setResult(null)
                    setError('')
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Reset
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}
          </article>

          <article className="rounded-[2rem] border border-emerald-100 bg-white p-6 editorial-shadow">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-2xl font-bold text-emerald-950">Prediction result</h2>
                <p className="mt-2 text-sm text-emerald-900/70">
                  Review how much has been eaten and inspect the annotated model output.
                </p>
              </div>
            </div>

            {result ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard label="Food left" value={formatPercent(result.food_percentage)} />
                  <MetricCard label="Plate empty" value={formatPercent(result.empty_percentage)} />
                  <MetricCard label="Predicted class" value={result.predicted_class || 'N/A'} />
                  <MetricCard label="Confidence" value={result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'} />
                </div>

                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-headline text-lg font-bold text-emerald-950">Annotated image</h3>
                    <a
                      href={result.annotated_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4"
                    >
                      Open full size
                    </a>
                  </div>
                  <img
                    src={result.annotated_image_url}
                    alt="Annotated prediction"
                    className="w-full rounded-[1.25rem] border border-emerald-200 object-cover"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-emerald-100 bg-white p-4">
                  <h3 className="font-headline text-lg font-bold text-emerald-950">Raw detections</h3>
                  <pre className="mt-3 overflow-x-auto rounded-2xl bg-emerald-950 p-4 text-xs leading-6 text-emerald-50">
                    {JSON.stringify(result.detections, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
                <span className="material-symbols-outlined text-6xl text-emerald-700">restaurant</span>
                <h3 className="mt-4 font-headline text-2xl font-bold text-emerald-950">
                  No prediction yet
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-emerald-900/70">
                  Upload a plate photo to see how much food remains and how much of the plate is empty.
                </p>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">{label}</div>
      <div className="mt-3 font-headline text-3xl font-extrabold text-emerald-950">{value}</div>
    </div>
  )
}
