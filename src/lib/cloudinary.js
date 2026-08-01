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
