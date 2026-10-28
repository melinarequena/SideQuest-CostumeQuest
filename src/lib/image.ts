const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function preparePhoto(file: File): Promise<Blob> {
  if (!allowedTypes.includes(file.type)) throw new Error("Elegí una foto JPG, PNG o WebP. Si tu foto es HEIC, exportala como JPG.");
  if (file.size > 15 * 1024 * 1024) throw new Error("La foto supera los 15 MB. Elegí una más liviana.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("No pudimos abrir esa imagen. Probá con otra foto."); }
  if (bitmap.width < 200 || bitmap.height < 200) {
    bitmap.close();
    throw new Error("La foto debe tener al menos 200 × 200 píxeles.");
  }
  const ratio = Math.min(1, 1600 / bitmap.width, 2000 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Tu navegador no pudo preparar la foto."); }
  context.fillStyle = "#151515";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob || blob.size > 3 * 1024 * 1024) reject(new Error("No pudimos comprimir la foto. Probá con una más chica."));
    else resolve(blob);
  }, "image/jpeg", 0.82));
}
