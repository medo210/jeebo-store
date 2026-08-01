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
