const DEFAULT_LISTING_IMAGE =
  "/listing-placeholder.svg";

function optimizeUnsplash(url: URL, width: number) {
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", "70");
  return url.toString();
}

function optimizeCloudinary(url: string, width: number) {
  if (!url.includes("/upload/")) {
    return url;
  }

  if (url.includes("/upload/f_auto,q_auto")) {
    return url;
  }

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,c_limit,w_${width}/`
  );
}

export function getOptimizedListingImage(imageUrl?: string | null, width = 1200) {
  const source = imageUrl?.trim() || DEFAULT_LISTING_IMAGE;

  try {
    const url = new URL(source);

    if (url.hostname === "images.unsplash.com") {
      return optimizeUnsplash(url, width);
    }

    if (url.hostname === "res.cloudinary.com") {
      return optimizeCloudinary(source, width);
    }

    return source;
  } catch {
    return source;
  }
}
