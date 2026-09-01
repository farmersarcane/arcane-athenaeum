'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizeIsbn, isValidIsbn } from '@/lib/isbn'

// Camera ISBN scanning. Prefers the native BarcodeDetector where the browser
// has it (Chrome/Android, and Safari 17+), and falls back to ZXing everywhere
// else. Manual entry is always available, so a denied camera permission is
// never a dead end (spec 10).

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

function nativeDetector(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector
  return ctor ?? null
}

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  /** Called with a validated ISBN. The scanner keeps running so a batch scan
   *  can continue; the caller closes it when done. */
  onDetected: (isbn: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Held in a ref so the scan loop always reaches the live callback without
  // re-running the effect, which would tear down and restart the camera.
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    let zxingControls: { stop: () => void } | null = null
    // Barcodes decode many times a second; without this the same book fires
    // dozens of callbacks and a batch scan adds it repeatedly.
    let lastValue = ''
    let lastAt = 0

    function emit(raw: string) {
      const isbn = normalizeIsbn(raw)
      if (!isValidIsbn(isbn)) return
      const now = Date.now()
      if (isbn === lastValue && now - lastAt < 2500) return
      lastValue = isbn
      lastAt = now
      onDetectedRef.current(isbn)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setReady(true)

        const Detector = nativeDetector()
        if (Detector) {
          const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          const tick = async () => {
            if (stopped || !videoRef.current) return
            const v = videoRef.current
            if (v.readyState === v.HAVE_ENOUGH_DATA && ctx) {
              canvas.width = v.videoWidth
              canvas.height = v.videoHeight
              ctx.drawImage(v, 0, 0)
              try {
                const codes = await detector.detect(canvas)
                for (const code of codes) emit(code.rawValue)
              } catch {
                // A single failed frame is normal; keep scanning.
              }
            }
            raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
          return
        }

        // Fallback: ZXing, imported lazily so the decoder bundle only loads
        // for browsers that actually need it.
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (stopped) return
        const reader = new BrowserMultiFormatReader()
        zxingControls = await reader.decodeFromVideoElement(
          videoRef.current!,
          (result) => {
            if (result) emit(result.getText())
          }
        )
      } catch (err) {
        const name = (err as { name?: string })?.name
        if (name === 'NotAllowedError') {
          setError(
            'Camera access was denied. You can still type the ISBN in by hand.'
          )
        } else if (name === 'NotFoundError') {
          setError('No camera found on this device. Type the ISBN in instead.')
        } else {
          setError('The camera could not be started. Type the ISBN in instead.')
        }
      }
    }

    start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      zxingControls?.stop()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="rounded-[10px] border border-line bg-surface p-3">
      <div className="relative overflow-hidden rounded-[8px] bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          className="block h-[240px] w-full object-cover"
        />
        {ready && !error ? (
          // Framing guide: a barcode centered in this window decodes fastest.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[84px] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border-2 border-clay/80"
          />
        ) : null}
      </div>

      <p className="mt-2 text-[12px] text-muted" role="status">
        {error ?? (ready ? 'Point the camera at the barcode on the back cover.' : 'Starting camera...')}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="focus-ring mt-2 rounded-[7px] border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
      >
        Close scanner
      </button>
    </div>
  )
}
