import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BarcodeScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
};

type DetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function nativeDetector(): DetectorLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => DetectorLike })
    .BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
    });
  } catch {
    return null;
  }
}

/**
 * Camera barcode scanner — prefers BarcodeDetector, falls back to @zxing/browser.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = "Scan barcode",
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stopped = useRef(false);

  const stop = useCallback(() => {
    stopped.current = true;
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    stopped.current = false;
    setError(null);
    setBusy(true);

    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = nativeDetector();
        if (detector) {
          const tick = async () => {
            if (stopped.current || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const value = codes.find((c) => c.rawValue)?.rawValue?.trim();
              if (value) {
                stop();
                onOpenChange(false);
                onDetected(value);
                return;
              }
            } catch {
              /* frame skipped */
            }
            raf = requestAnimationFrame(() => void tick());
          };
          raf = requestAnimationFrame(() => void tick());
          setBusy(false);
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        zxingControls = await reader.decodeFromStream(stream, video, (result) => {
          const text = result?.getText()?.trim();
          if (!text || stopped.current) return;
          stop();
          zxingControls?.stop();
          onOpenChange(false);
          onDetected(text);
        });
        setBusy(false);
      } catch (err) {
        setBusy(false);
        setError(
          err instanceof Error
            ? err.message
            : "Could not open the camera. Allow camera access and try again.",
        );
      }
    };

    void run();
    return () => {
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stop();
    };
  }, [open, onDetected, onOpenChange, stop]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stop();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Point the camera at a product barcode. Scanning stops automatically when a code is read.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted relative overflow-hidden rounded-xl">
          <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted />
          {busy && (
            <p className="text-muted-foreground absolute inset-x-0 bottom-3 text-center text-xs">
              Starting camera…
            </p>
          )}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            stop();
            onOpenChange(false);
          }}
        >
          <X className="size-4" /> Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
