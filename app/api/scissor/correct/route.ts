import { NextResponse } from "next/server";
import { runSpectralScissorV03 } from "@/src/core/scissor";

export const runtime = "nodejs";

type SpectrumRequest = {
  readonly wavelengthsNm?: unknown;
  readonly reflectance?: unknown;
};

type ScissorRequest = {
  readonly referenceA?: SpectrumRequest;
  readonly referenceB?: SpectrumRequest;
  readonly epsilon?: unknown;
  readonly smoothSigmaBands?: unknown;
  readonly smoothRadius?: unknown;
};

function spectrum(value: SpectrumRequest | undefined) {
  if (!value || !Array.isArray(value.wavelengthsNm) || !Array.isArray(value.reflectance)) {
    throw new Error("referenceA and referenceB require wavelengthsNm and reflectance arrays.");
  }
  return {
    wavelengthsNm: value.wavelengthsNm as number[],
    reflectance: value.reflectance as number[],
  };
}

export async function POST(request: Request) {
  let body: ScissorRequest;
  try {
    body = (await request.json()) as ScissorRequest;
  } catch {
    return NextResponse.json(
      { status: "INVALID_SCISSOR_REQUEST", error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const result = runSpectralScissorV03(
      spectrum(body.referenceA),
      spectrum(body.referenceB),
      {
        epsilon: body.epsilon as number | undefined,
        smoothSigmaBands: body.smoothSigmaBands as number | undefined,
        smoothRadius: body.smoothRadius as number | undefined,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "INVALID_SCISSOR_REQUEST",
        error: error instanceof Error ? error.message : "Invalid Spectral Scissor request.",
      },
      { status: 400 },
    );
  }
}
