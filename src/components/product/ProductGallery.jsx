import { useState } from "react";

function ProductGallery({ product }) {
  const images = product.images?.length ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl bg-zinc-100">
        <img
          src={activeImage}
          alt={product.name}
          width="800"
          height="800"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image}
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
                src={image}
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
