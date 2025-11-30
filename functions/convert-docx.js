import mammoth from "mammoth";

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.convertToHtml({ buffer });

    return new Response(JSON.stringify({ html: result.value }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}
