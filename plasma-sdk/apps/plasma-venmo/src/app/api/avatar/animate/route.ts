export async function POST() {
  return Response.json(
    {
      error:
        "Video generation is not configured. Set VEO_API_KEY and VEO_MODEL to enable animation renders.",
    },
    { status: 501 }
  );
}
