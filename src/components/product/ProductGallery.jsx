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
