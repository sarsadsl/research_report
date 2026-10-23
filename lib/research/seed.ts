import type { ResearchDetail } from "./types";
import generatedGogolookSeed from "./generated/gogolook-6902.json";
import generatedJinguSeed from "./generated/jingu-8358.json";
import generatedStlSeed from "./generated/stl-4931.json";
import generatedVpecSeed from "./generated/vpec-2455.json";

export const jinguSeed = generatedJinguSeed as unknown as ResearchDetail;
export const gogolookSeed = generatedGogolookSeed as unknown as ResearchDetail;
export const stlSeed = generatedStlSeed as unknown as ResearchDetail;
export const vpecSeed = generatedVpecSeed as unknown as ResearchDetail;
