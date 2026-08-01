$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Jeebo Product Slider Upgrade" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$target = ".\src\components\product\ProductGallery.jsx"

if (-not (Test-Path $target)) {
  throw "ProductGallery.jsx not found. Put this file inside jeebo-store."
}

Copy-Item $target "$target.before-slider.bak" -Force

@'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from "lucide-react";
import {
  cloudinarySrcSet,
  cloudinaryUrl,
} from "../../lib/cloudinary";

function clampIndex(index, length) {
  if (!length) return 0;
  return (index + length) % length;
}

export default function ProductGallery({ product }) {
  const images = useMemo(
    () =>
      Array.isArray(product.images) && product.images.length
        ? product.images.filter(Boolean)
        : [product.image].filter(Boolean),
    [product.images, product.image],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const touchStartX = useRef(null);
  const dragStartX = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [images.length, activeIndex]);

  const goTo = useCallback(
    (index) => {
      setActiveIndex(clampIndex(index, images.length));
    },
    [images.length],
  );

  const previous = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  const next = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "Escape") setFullscreen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  useEffect(() => {
    if (!fullscreen) return undefined;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [fullscreen]);

  function finishSwipe(startX, endX) {
    if (startX === null || endX === null) return;

    const difference = endX - startX;

    if (Math.abs(difference) < 45) return;

    if (difference > 0) {
      previous();
    } else {
      next();
    }
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const endX = event.changedTouches[0]?.clientX ?? null;
    finishSwipe(touchStartX.current, endX);
    touchStartX.current = null;
  }

  function handlePointerDown(event) {
    if (event.pointerType === "touch") return;

    dragStartX.current = event.clientX;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (!dragging.current) return;

    finishSwipe(dragStartX.current, event.clientX);

    dragging.current = false;
    dragStartX.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-white text-zinc-400">
        لا توجد صورة
      </div>
    );
  }

  const activeImage = images[activeIndex];

  const imageElement = (
    <img
      src={cloudinaryUrl(activeImage, {
        width: fullscreen ? 1600 : 1000,
        height: fullscreen ? 1600 : 1000,
        crop: "pad",
      })}
      srcSet={cloudinarySrcSet(
        activeImage,
        fullscreen
          ? [800, 1200, 1600, 2000]
          : [480, 720, 1000, 1400],
        {
          height: fullscreen ? 2000 : 1400,
          crop: "pad",
        },
      )}
      sizes={
        fullscreen
          ? "100vw"
          : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 620px"
      }
      alt={product.name}
      width={fullscreen ? 1600 : 1000}
      height={fullscreen ? 1600 : 1000}
      decoding="async"
      fetchPriority="high"
      draggable="false"
      className="h-full w-full select-none object-contain"
    />
  );

  return (
    <>
      <div className="w-full">
        <div
          className="group relative flex aspect-square w-full cursor-grab items-center justify-center overflow-hidden rounded-3xl bg-white p-2 active:cursor-grabbing sm:p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragging.current = false;
            dragStartX.current = null;
          }}
        >
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="h-full w-full"
            aria-label="فتح معرض الصور بالحجم الكامل"
          >
            {imageElement}
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  previous();
                }}
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg transition hover:scale-105 lg:block"
                aria-label="الصورة السابقة"
              >
                <ChevronRight size={22} />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  next();
                }}
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg transition hover:scale-105 lg:block"
                aria-label="الصورة التالية"
              >
                <ChevronLeft size={22} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute left-3 top-3 rounded-full bg-white/95 p-2.5 shadow-md transition hover:scale-105"
            aria-label="تكبير الصورة"
          >
            <Maximize2 size={18} />
          </button>

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-black text-white">
              {activeIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`عرض الصورة رقم ${index + 1}`}
                className={`rounded-full transition-all ${
                  activeIndex === index
                    ? "h-2.5 w-7 bg-zinc-950"
                    : "h-2.5 w-2.5 bg-zinc-300 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        )}

        {images.length > 1 && (
          <p className="mt-3 text-center text-xs text-zinc-500 lg:hidden">
            اسحب الصورة يمين أو شمال
          </p>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="معرض صور المنتج"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute left-4 top-4 z-10 rounded-full bg-white p-3 text-zinc-950 shadow-lg"
            aria-label="إغلاق المعرض"
          >
            <X size={23} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={previous}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-zinc-950 shadow-lg sm:right-6"
                aria-label="الصورة السابقة"
              >
                <ChevronRight size={25} />
              </button>

              <button
                type="button"
                onClick={next}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-3 text-zinc-950 shadow-lg sm:left-6"
                aria-label="الصورة التالية"
              >
                <ChevronLeft size={25} />
              </button>
            </>
          )}

          <div
            className="flex h-[88vh] w-full max-w-6xl items-center justify-center overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            {imageElement}
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-3">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`rounded-full transition-all ${
                    activeIndex === index
                      ? "h-2.5 w-7 bg-white"
                      : "h-2.5 w-2.5 bg-white/40"
                  }`}
                  aria-label={`عرض الصورة رقم ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
'@ | Set-Content -Encoding utf8 $target

Write-Host "Building..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
  throw "Build failed."
}

Write-Host "Saving to Git..." -ForegroundColor Yellow
git add .

try {
  git commit -m "Add swipe product image slider"
} catch {
  Write-Host "No new commit or Git warning." -ForegroundColor DarkYellow
}

try {
  git push origin main
} catch {
  Write-Host "Git push warning; continuing." -ForegroundColor DarkYellow
}

Write-Host "Deploying..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name jeebo-store --branch main

if ($LASTEXITCODE -ne 0) {
  throw "Deploy failed."
}

Write-Host ""
Write-Host "Product slider deployed successfully." -ForegroundColor Green
Write-Host "Open: https://jeebo-store.pages.dev" -ForegroundColor Cyan
