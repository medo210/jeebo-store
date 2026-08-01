$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Jeebo Cloudinary Images Upgrade" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$productsFile = ".\src\pages\admin\Products.jsx"

if (-not (Test-Path $productsFile)) {
  throw "Products.jsx not found. Run this file inside jeebo-store."
}

Copy-Item $productsFile "$productsFile.before-cloudinary.bak" -Force

@'
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  updateProduct,
} from "../../api/admin";
import {
  ErrorBox,
  LoadingBox,
  Modal,
  PageHeader,
} from "../../components/admin/AdminUI";

const CLOUDINARY_CLOUD_NAME = "tzhhxskl";
const CLOUDINARY_UPLOAD_PRESET = "jeebo_products";
const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const emptyForm = {
  name: "",
  slug: "",
  category: "",
  description: "",
  price: "",
  oldPrice: "",
  badge: "",
  images: [],
  status: true,
  sortOrder: 0,
};

function optimizedImage(url, width = 500) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

async function uploadToCloudinary(file, onProgress) {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "jeebo/products");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", CLOUDINARY_UPLOAD_URL);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let data;

      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("استجابة رفع الصورة غير صحيحة."));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
        });
        return;
      }

      reject(
        new Error(
          data?.error?.message ||
            "تعذر رفع الصورة إلى Cloudinary.",
        ),
      );
    });

    xhr.addEventListener("error", () => {
      reject(new Error("فشل الاتصال أثناء رفع الصورة."));
    });

    xhr.send(formData);
  });
}

export default function Products() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const query = useQuery({
    queryKey: ["admin-products"],
    queryFn: getAdminProducts,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing?.mode === "edit"
        ? updateProduct(editing.id, payload)
        : createProduct(payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
      closeModal();
    },
  });

  const removeMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });

  const products = query.data?.products || [];

  const categories = useMemo(
    () => [
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean),
      ),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        String(product.name).toLowerCase().includes(term) ||
        String(product.slug).toLowerCase().includes(term) ||
        String(product.category || "")
          .toLowerCase()
          .includes(term);

      const matchesCategory =
        !category || product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  function closeModal() {
    setEditing(null);
    setForm(emptyForm);
    setUploading(false);
    setUploadProgress(0);
    setUploadError("");
  }

  function openCreate() {
    setEditing({ mode: "create" });
    setForm(emptyForm);
    setUploadError("");
  }

  function openEdit(product) {
    setEditing({
      mode: "edit",
      id: product.id,
    });

    setForm({
      name: product.name || "",
      slug: product.slug || "",
      category: product.category || "",
      description: product.description || "",
      price: product.price ?? "",
      oldPrice: product.old_price ?? "",
      badge: product.badge || "",
      images:
        Array.isArray(product.images) &&
        product.images.length
          ? product.images
          : product.image
            ? [product.image]
            : [],
      status: Boolean(product.status),
      sortOrder: product.sort_order || 0,
    });

    setUploadError("");
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    const remaining = Math.max(12 - form.images.length, 0);

    if (!remaining) {
      setUploadError("الحد الأقصى 12 صورة لكل منتج.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError("");

    try {
      const uploadedUrls = [];

      for (const file of files.slice(0, remaining)) {
        const result = await uploadToCloudinary(
          file,
          setUploadProgress,
        );
        uploadedUrls.push(result.url);
      }

      setForm((current) => ({
        ...current,
        images: [
          ...current.images,
          ...uploadedUrls,
        ].slice(0, 12),
      }));
    } catch (error) {
      setUploadError(
        error.message || "تعذر رفع الصورة.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.filter(
        (_, imageIndex) => imageIndex !== index,
      ),
    }));
  }

  function moveImage(index, direction) {
    setForm((current) => {
      const targetIndex = index + direction;

      if (
        targetIndex < 0 ||
        targetIndex >= current.images.length
      ) {
        return current;
      }

      const images = [...current.images];
      [images[index], images[targetIndex]] = [
        images[targetIndex],
        images[index],
      ];

      return {
        ...current,
        images,
      };
    });
  }

  if (query.isLoading) {
    return (
      <LoadingBox text="جاري تحميل المنتجات..." />
    );
  }

  if (query.isError) {
    return (
      <ErrorBox
        message={query.error.message}
        onRetry={query.refetch}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="إدارة المنتجات"
        description={`${products.length} منتج`}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 font-black text-white"
          >
            <Plus size={18} />
            إضافة منتج
          </button>
        }
      />

      <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_240px]">
        <label className="relative">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
            size={18}
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="ابحث باسم المنتج أو الرابط..."
            className="h-12 w-full rounded-xl border pr-11 pl-4"
          />
        </label>

        <select
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
          className="h-12 rounded-xl border bg-white px-4"
        >
          <option value="">كل التصنيفات</option>

          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="p-4">الصورة</th>
                <th className="p-4">المنتج</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">الرابط</th>
                <th className="p-4">السعر</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الترتيب</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-t"
                >
                  <td className="p-4">
                    <div className="h-14 w-14 overflow-hidden rounded-xl border bg-zinc-100">
                      {product.image ? (
                        <img
                          src={optimizedImage(
                            product.image,
                            160,
                          )}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                          بلا صورة
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-4 font-black">
                    {product.name}
                  </td>

                  <td className="p-4">
                    {product.category || "—"}
                  </td>

                  <td className="p-4" dir="ltr">
                    /{product.slug}
                  </td>

                  <td className="p-4 font-black">
                    {product.price} جنيه
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        product.status
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {product.status
                        ? "مفعل"
                        : "متوقف"}
                    </span>
                  </td>

                  <td className="p-4">
                    {product.sort_order}
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(product)
                        }
                        className="rounded-lg border p-2.5"
                        aria-label="تعديل"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              "هل تريد حذف المنتج نهائيًا؟",
                            )
                          ) {
                            removeMutation.mutate(
                              product.id,
                            );
                          }
                        }}
                        className="rounded-lg border border-red-200 p-2.5 text-red-700"
                        aria-label="حذف"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredProducts.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="p-12 text-center text-zinc-500"
                  >
                    لا توجد نتائج.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={closeModal}
        title={
          editing?.mode === "create"
            ? "إضافة منتج"
            : "تعديل المنتج"
        }
        width="max-w-4xl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();

            saveMutation.mutate({
              ...form,
              images: form.images,
              image: form.images[0] || "",
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {[
            ["name", "اسم المنتج", "text"],
            [
              "slug",
              "الرابط بالإنجليزية",
              "text",
            ],
            ["category", "التصنيف", "text"],
            ["price", "السعر", "number"],
            [
              "oldPrice",
              "السعر القديم",
              "number",
            ],
            ["badge", "الشارة", "text"],
            [
              "sortOrder",
              "الترتيب",
              "number",
            ],
          ].map(([name, label, type]) => (
            <label
              key={name}
              className="grid gap-2"
            >
              <span className="font-bold">
                {label}
              </span>

              <input
                type={type}
                required={[
                  "name",
                  "slug",
                  "price",
                ].includes(name)}
                value={form[name]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [name]: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border px-4"
                dir={
                  name === "slug"
                    ? "ltr"
                    : undefined
                }
              />
            </label>
          ))}

          <label className="grid gap-2 sm:col-span-2">
            <span className="font-bold">
              الوصف
            </span>

            <textarea
              required
              rows="5"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description:
                    event.target.value,
                }))
              }
              className="rounded-xl border p-4"
            />
          </label>

          <section className="sm:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-black">
                  صور المنتج
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  أول صورة هي الصورة الرئيسية
                </p>
              </div>

              <span className="text-xs font-bold text-zinc-500">
                {form.images.length}/12
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFiles}
              className="hidden"
            />

            <button
              type="button"
              disabled={
                uploading ||
                form.images.length >= 12
              }
              onClick={() =>
                inputRef.current?.click()
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 p-6 font-black transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImagePlus size={21} />

              {uploading
                ? `جاري الرفع ${uploadProgress}%`
                : "اختار صور من الجهاز"}
            </button>

            {uploading && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-zinc-950 transition-all"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            )}

            {uploadError && (
              <p className="mt-3 rounded-xl bg-red-50 p-4 font-bold text-red-800">
                {uploadError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {form.images.map((url, index) => (
                <article
                  key={`${url}-${index}`}
                  className="relative overflow-hidden rounded-2xl border bg-zinc-100"
                >
                  <div className="aspect-square">
                    <img
                      src={optimizedImage(
                        url,
                        600,
                      )}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeImage(index)
                    }
                    className="absolute left-2 top-2 rounded-full bg-black/80 p-2 text-white"
                    aria-label="حذف الصورة"
                  >
                    <X size={15} />
                  </button>

                  {index === 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-[10px] font-black shadow">
                      الرئيسية
                    </span>
                  )}

                  <div className="flex items-center justify-center gap-2 border-t bg-white p-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        moveImage(index, -1)
                      }
                      className="rounded-lg border p-2 disabled:opacity-30"
                      aria-label="نقل لأعلى"
                    >
                      <ArrowUp size={14} />
                    </button>

                    <button
                      type="button"
                      disabled={
                        index ===
                        form.images.length - 1
                      }
                      onClick={() =>
                        moveImage(index, 1)
                      }
                      className="rounded-lg border p-2 disabled:opacity-30"
                      aria-label="نقل لأسفل"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <label className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status:
                    event.target.checked,
                }))
              }
            />

            <span className="font-bold">
              المنتج مفعل ويظهر في المتجر
            </span>
          </label>

          {saveMutation.isError && (
            <p className="font-bold text-red-700 sm:col-span-2">
              {saveMutation.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={
              saveMutation.isPending ||
              uploading
            }
            className="rounded-xl bg-zinc-950 px-6 py-4 font-black text-white sm:col-span-2 disabled:opacity-60"
          >
            {saveMutation.isPending
              ? "جاري الحفظ..."
              : "حفظ المنتج"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
'@ | Set-Content -Encoding utf8 $productsFile

Write-Host "Building..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
  throw "Build failed."
}

Write-Host "Saving to Git..." -ForegroundColor Yellow
git add .
try {
  git commit -m "Add Cloudinary product image uploads"
} catch {
  Write-Host "No new commit or Git warning." -ForegroundColor DarkYellow
}

try {
  git push origin main
} catch {
  Write-Host "Git push warning; continuing to deployment." -ForegroundColor DarkYellow
}

Write-Host "Deploying..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name jeebo-store --branch main

if ($LASTEXITCODE -ne 0) {
  throw "Deploy failed."
}

Write-Host ""
Write-Host "Cloudinary upload is live." -ForegroundColor Green
Write-Host "Open: https://jeebo-store.pages.dev/admin/products" -ForegroundColor Cyan
