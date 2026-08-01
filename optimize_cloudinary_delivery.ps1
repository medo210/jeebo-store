$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Jeebo Cloudinary Delivery Optimization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path ".\src\lib" | Out-Null

@'
function isCloudinaryUrl(url) {
  return typeof url === "string" &&
    url.includes("res.cloudinary.com") &&
    url.includes("/image/upload/");
}

export function cloudinaryUrl(
  url,
  {
    width,
    height,
    crop = "limit",
    quality = "auto",
    format = "auto",
    dpr = "auto",
  } = {},
) {
  if (!url || !isCloudinaryUrl(url)) return url;

  const transformations = [
    `f_${format}`,
    `q_${quality}`,
    `dpr_${dpr}`,
    width ? `w_${Math.round(width)}` : null,
    height ? `h_${Math.round(height)}` : null,
    crop ? `c_${crop}` : null,
  ].filter(Boolean);

  const cleanUrl = url.replace(
    /\/image\/upload\/(?:f_[^/]+,q_[^/]+[^/]*)?\//,
    "/image/upload/",
  );

  return cleanUrl.replace(
    "/image/upload/",
    `/image/upload/${transformations.join(",")}/`,
  );
}

export function cloudinarySrcSet(
  url,
  widths,
  options = {},
) {
  if (!url || !isCloudinaryUrl(url)) return undefined;

  return widths
    .map(
      (width) =>
        `${cloudinaryUrl(url, {
          ...options,
          width,
        })} ${width}w`,
    )
    .join(", ");
}
'@ | Set-Content -Encoding utf8 ".\src\lib\cloudinary.js"

@'
import { useEffect, useMemo, useState } from "react";
import {
  cloudinarySrcSet,
  cloudinaryUrl,
} from "../../lib/cloudinary";

function ProductGallery({ product }) {
  const images = useMemo(
    () =>
      product.images?.length
        ? product.images
        : [product.image].filter(Boolean),
    [product.images, product.image],
  );

  const [activeImage, setActiveImage] = useState(
    images[0] || "",
  );

  useEffect(() => {
    if (!images.includes(activeImage)) {
      setActiveImage(images[0] || "");
    }
  }, [images, activeImage]);

  if (!activeImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400">
        لا توجد صورة
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl bg-zinc-100">
        <img
          src={cloudinaryUrl(activeImage, {
            width: 900,
            height: 900,
            crop: "fill",
          })}
          srcSet={cloudinarySrcSet(
            activeImage,
            [480, 720, 900, 1200],
            {
              height: 1200,
              crop: "fill",
            },
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          alt={product.name}
          width="900"
          height="900"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              aria-label={`عرض صورة المنتج رقم ${index + 1}`}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                activeImage === image
                  ? "border-zinc-950"
                  : "border-transparent"
              }`}
            >
              <img
                src={cloudinaryUrl(image, {
                  width: 160,
                  height: 160,
                  crop: "fill",
                })}
                srcSet={cloudinarySrcSet(
                  image,
                  [80, 120, 160],
                  {
                    height: 160,
                    crop: "fill",
                  },
                )}
                sizes="80px"
                alt=""
                width="160"
                height="160"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;
'@ | Set-Content -Encoding utf8 ".\src\components\product\ProductGallery.jsx"

@'
import { Link } from "react-router-dom";
import {
  cloudinarySrcSet,
  cloudinaryUrl,
} from "../../lib/cloudinary";

function ProductCard({ product }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link
        to={`/products/${product.slug}`}
        className="block"
      >
        <div className="relative aspect-square overflow-hidden bg-zinc-100">
          {product.image ? (
            <img
              src={cloudinaryUrl(product.image, {
                width: 640,
                height: 640,
                crop: "fill",
              })}
              srcSet={cloudinarySrcSet(
                product.image,
                [320, 480, 640, 800],
                {
                  height: 800,
                  crop: "fill",
                },
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              alt={product.name}
              width="640"
              height="640"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              لا توجد صورة
            </div>
          )}

          {product.badge && (
            <span className="absolute right-3 top-3 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white">
              {product.badge}
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-xl font-black text-zinc-950">
            {product.name}
          </h3>

          <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600">
            {product.description}
          </p>

          <div className="mt-5 flex items-end gap-2">
            <span className="text-2xl font-black text-zinc-950">
              {product.price} جنيه
            </span>

            {product.oldPrice && (
              <span className="pb-1 text-sm text-zinc-400 line-through">
                {product.oldPrice} جنيه
              </span>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-zinc-950 px-5 py-3.5 text-center text-sm font-black text-white">
            عرض المنتج
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
'@ | Set-Content -Encoding utf8 ".\src\components\common\ProductCard.jsx"

Write-Host "Building..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
  throw "Build failed."
}

Write-Host "Saving to Git..." -ForegroundColor Yellow
git add .

try {
  git commit -m "Optimize Cloudinary image delivery"
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
Write-Host "Image optimization deployed successfully." -ForegroundColor Green
Write-Host "Test: https://jeebo-store.pages.dev" -ForegroundColor Cyan
