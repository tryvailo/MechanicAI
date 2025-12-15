import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type VinOcrResponse = {
  success: true;
  vin: string;
  confidence: 'high' | 'medium' | 'low';
  vehicleInfo?: {
    year?: string;
    make?: string;
    model?: string;
    engine?: string;
    country?: string;
  };
  rawText?: string;
} | {
  success: false;
  error: string;
  suggestion?: string;
};

const VIN_OCR_PROMPT = `You are a VIN (Vehicle Identification Number) OCR specialist for EUROPEAN vehicles. Analyze the provided image and extract the VIN code.

FOCUS: Western European vehicles (Germany, France, Italy, UK, Spain, Netherlands, Belgium, Austria, Switzerland, Poland, Czech Republic, Sweden)

TASK:
1. Look for a 17-character VIN code in the image
2. European VIN locations:
   - Door B-pillar (driver or passenger side) — most common in EU
   - Under the windshield (visible from outside, driver's side)
   - Engine bay plate (often on firewall or strut tower)
   - Vehicle registration document (Fahrzeugschein/Zulassungsbescheinigung Teil I in Germany, Carte Grise in France, Libretto in Italy)
   - Service booklet / maintenance log
3. VIN format: 17 characters, uses letters A-Z (except I, O, Q) and numbers 0-9

EUROPEAN WMI CODES (first 3 characters):
- W** = Germany (WBA/WBS=BMW, WAU/WUA=Audi, WVW=VW, WDB/WDD=Mercedes, WP0=Porsche)
- VF* = France (VF1=Renault, VF3=Peugeot, VF7=Citroën, VF8=Bugatti)
- Z** = Italy (ZAR=Alfa Romeo, ZFA=Fiat, ZFF=Ferrari, ZHW=Lamborghini, ZAM=Maserati, ZLA=Lancia)
- S** = UK (SAJ=Jaguar, SAL=Land Rover, SCC=Lotus, SCF=Aston Martin, SHH=Honda UK)
- VS* = Spain (VSS=SEAT, VS6=Ford Spain, VSK=Nissan Spain)
- XL* = Netherlands (XLE=Scania, XLR=DAF)
- TRU = Hungary (Audi Hungary)
- TMB = Czech Republic (Škoda)
- YV* = Sweden (YV1=Volvo, YK1=Saab)
- SUF = Poland (Fiat Poland)

VALIDATION RULES:
- Must be exactly 17 characters
- Cannot contain letters I, O, or Q
- Position 9: In EU, this is NOT always a check digit (check digit is primarily USA/Canada requirement)
- Positions 1-3: World Manufacturer Identifier (WMI)
- Positions 4-8: Vehicle attributes (model, body, engine)
- Position 10: Model year code
- Positions 11-17: Serial number

RESPONSE FORMAT (JSON only):
{
  "detected": true/false,
  "vin": "THE17CHARVINCODE" or null,
  "confidence": "high" | "medium" | "low",
  "vehicleInfo": {
    "year": "decoded year if possible",
    "make": "manufacturer if identifiable",
    "model": "model if visible on label",
    "engine": "engine info if visible (e.g., 2.0 TDI, 3.0 TFSI)",
    "country": "country of manufacture"
  },
  "rawText": "any other text visible near VIN (HSN/TSN numbers for Germany, Type Mine for France)",
  "issues": "description of any issues (blurry, partial, etc.)"
}

ADDITIONAL EU-SPECIFIC DATA TO LOOK FOR:
- HSN/TSN (Germany): Herstellerschlüsselnummer/Typschlüsselnummer — helps identify exact model variant
- Type Mine (France): National type approval number
- Codice Fiscale (Italy): Italian vehicle registration number
- Engine code: Often visible near VIN on door sticker

If no VIN is detected, explain what you see and suggest how to get a better photo.`;

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

function validateFileType(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
}

function validateVin(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanVin.length !== 17) return false;
  if (/[IOQ]/.test(cleanVin)) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);
}

function decodeVinYear(char: string): string | null {
  const yearCodes: Record<string, string> = {
    'A': '2010', 'B': '2011', 'C': '2012', 'D': '2013', 'E': '2014',
    'F': '2015', 'G': '2016', 'H': '2017', 'J': '2018', 'K': '2019',
    'L': '2020', 'M': '2021', 'N': '2022', 'P': '2023', 'R': '2024',
    'S': '2025', 'T': '2026', 'V': '2027', 'W': '2028', 'X': '2029',
    'Y': '2030', '1': '2031', '2': '2032', '3': '2033', '4': '2034',
    '5': '2035', '6': '2036', '7': '2037', '8': '2038', '9': '2039',
  };
  return yearCodes[char.toUpperCase()] || null;
}

function decodeWmi(wmi: string): { make?: string; country?: string } {
  const wmiDatabase: Record<string, { make: string; country: string }> = {
    // === GERMANY (W) ===
    'WBA': { make: 'BMW', country: 'Germany' },
    'WBS': { make: 'BMW M', country: 'Germany' },
    'WBY': { make: 'BMW i', country: 'Germany' },
    'WUA': { make: 'Audi', country: 'Germany' },
    'WAU': { make: 'Audi', country: 'Germany' },
    'WVW': { make: 'Volkswagen', country: 'Germany' },
    'WV1': { make: 'Volkswagen Commercial', country: 'Germany' },
    'WV2': { make: 'Volkswagen Bus/Van', country: 'Germany' },
    'WDB': { make: 'Mercedes-Benz', country: 'Germany' },
    'WDD': { make: 'Mercedes-Benz', country: 'Germany' },
    'WDC': { make: 'Mercedes-Benz SUV', country: 'Germany' },
    'WDF': { make: 'Mercedes-Benz Van', country: 'Germany' },
    'WMW': { make: 'MINI', country: 'Germany' },
    'WF0': { make: 'Ford', country: 'Germany' },
    'WP0': { make: 'Porsche', country: 'Germany' },
    'WP1': { make: 'Porsche Cayenne/Macan', country: 'Germany' },
    'W0L': { make: 'Opel', country: 'Germany' },
    'W0V': { make: 'Opel', country: 'Germany' },
    'WME': { make: 'Smart', country: 'Germany' },
    
    // === FRANCE (VF) ===
    'VF1': { make: 'Renault', country: 'France' },
    'VF2': { make: 'Renault', country: 'France' },
    'VF3': { make: 'Peugeot', country: 'France' },
    'VF7': { make: 'Citroën', country: 'France' },
    'VF8': { make: 'Bugatti', country: 'France' },
    'VNK': { make: 'Toyota France', country: 'France' },
    'VR1': { make: 'DS Automobiles', country: 'France' },
    'VR3': { make: 'Peugeot', country: 'France' },
    'VR7': { make: 'Citroën', country: 'France' },
    
    // === ITALY (Z) ===
    'ZAR': { make: 'Alfa Romeo', country: 'Italy' },
    'ZFA': { make: 'Fiat', country: 'Italy' },
    'ZFC': { make: 'Fiat Commercial', country: 'Italy' },
    'ZFF': { make: 'Ferrari', country: 'Italy' },
    'ZHW': { make: 'Lamborghini', country: 'Italy' },
    'ZAM': { make: 'Maserati', country: 'Italy' },
    'ZLA': { make: 'Lancia', country: 'Italy' },
    'ZDF': { make: 'Ferrari', country: 'Italy' },
    'ZCF': { make: 'Iveco', country: 'Italy' },
    'ZAP': { make: 'Piaggio', country: 'Italy' },
    
    // === UK (S) ===
    'SAJ': { make: 'Jaguar', country: 'UK' },
    'SAL': { make: 'Land Rover', country: 'UK' },
    'SAR': { make: 'Rover', country: 'UK' },
    'SCC': { make: 'Lotus', country: 'UK' },
    'SCF': { make: 'Aston Martin', country: 'UK' },
    'SDB': { make: 'Bentley', country: 'UK' },
    'SJN': { make: 'Nissan UK', country: 'UK' },
    'SHH': { make: 'Honda UK', country: 'UK' },
    'SFD': { make: 'Alexander Dennis', country: 'UK' },
    'SKF': { make: 'McLaren', country: 'UK' },
    'SBM': { make: 'McLaren', country: 'UK' },
    
    // === SPAIN (VS) ===
    'VSS': { make: 'SEAT', country: 'Spain' },
    'VS6': { make: 'Ford Spain', country: 'Spain' },
    'VS7': { make: 'Citroën Spain', country: 'Spain' },
    'VSK': { make: 'Nissan Spain', country: 'Spain' },
    'VSX': { make: 'Opel Spain', country: 'Spain' },
    'VWV': { make: 'Volkswagen Spain', country: 'Spain' },
    
    // === SWEDEN (YV) ===
    'YV1': { make: 'Volvo', country: 'Sweden' },
    'YV4': { make: 'Volvo', country: 'Sweden' },
    'YK1': { make: 'Saab', country: 'Sweden' },
    'YS2': { make: 'Scania', country: 'Sweden' },
    'YS3': { make: 'Saab', country: 'Sweden' },
    
    // === CZECH REPUBLIC (TM) ===
    'TMB': { make: 'Škoda', country: 'Czech Republic' },
    'TMP': { make: 'Škoda', country: 'Czech Republic' },
    
    // === HUNGARY (TR) ===
    'TRU': { make: 'Audi', country: 'Hungary' },
    
    // === POLAND (SU) ===
    'SUF': { make: 'Fiat Poland', country: 'Poland' },
    'SUP': { make: 'FSO', country: 'Poland' },
    
    // === NETHERLANDS (XL) ===
    'XLE': { make: 'Scania', country: 'Netherlands' },
    'XLR': { make: 'DAF', country: 'Netherlands' },
    'XLB': { make: 'Volvo Trucks', country: 'Netherlands' },
    
    // === BELGIUM (VV) ===
    'VV9': { make: 'Volvo Belgium', country: 'Belgium' },
    
    // === AUSTRIA (V) ===
    'VAN': { make: 'MAN', country: 'Austria' },
    
    // === PORTUGAL (RP) ===
    'RP1': { make: 'Mitsubishi Portugal', country: 'Portugal' },
    
    // === SLOVENIA (U5) ===
    'U5Y': { make: 'Kia', country: 'Slovenia' },
    
    // === JAPAN (common imports to EU) ===
    'JN1': { make: 'Nissan', country: 'Japan' },
    'JMZ': { make: 'Mazda', country: 'Japan' },
    'JM1': { make: 'Mazda', country: 'Japan' },
    'JT2': { make: 'Toyota', country: 'Japan' },
    'JTE': { make: 'Toyota', country: 'Japan' },
    'JHM': { make: 'Honda', country: 'Japan' },
    'JF1': { make: 'Subaru', country: 'Japan' },
    'JF2': { make: 'Subaru', country: 'Japan' },
    
    // === SOUTH KOREA (common in EU) ===
    'KMH': { make: 'Hyundai', country: 'South Korea' },
    'KNA': { make: 'Kia', country: 'South Korea' },
    'KND': { make: 'Kia', country: 'South Korea' },
    'KNM': { make: 'Renault Samsung', country: 'South Korea' },
    
    // === TURKEY (manufactured for EU market) ===
    'NMT': { make: 'Toyota Turkey', country: 'Turkey' },
    'NM0': { make: 'Ford Turkey', country: 'Turkey' },
    'NM4': { make: 'Tofaş/Fiat', country: 'Turkey' },
    
    // === SOUTH AFRICA (some EU imports) ===
    'WVG': { make: 'Volkswagen SA', country: 'South Africa' },
    'AHT': { make: 'Toyota SA', country: 'South Africa' },
  };

  const prefix = wmi.toUpperCase().substring(0, 3);
  return wmiDatabase[prefix] || {};
}

async function callOpenAIVision(apiKey: string, imageBase64: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: VIN_OCR_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the VIN code from this image.' },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callClaudeVision(apiKey: string, imageBase64: string): Promise<string> {
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const mimeType = imageBase64.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: VIN_OCR_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: 'Extract the VIN code from this image.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

function parseVinResponse(text: string): VinOcrResponse {
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/i, '').replace(/```\n?$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/i, '').replace(/```\n?$/, '');
  }

  try {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.detected && parsed.vin) {
        const cleanVin = parsed.vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (validateVin(cleanVin)) {
          const wmiInfo = decodeWmi(cleanVin.substring(0, 3));
          const yearFromVin = decodeVinYear(cleanVin[9]);
          
          return {
            success: true,
            vin: cleanVin,
            confidence: parsed.confidence || 'medium',
            vehicleInfo: {
              year: parsed.vehicleInfo?.year || yearFromVin || undefined,
              make: parsed.vehicleInfo?.make || wmiInfo.make,
              model: parsed.vehicleInfo?.model,
              engine: parsed.vehicleInfo?.engine,
              country: parsed.vehicleInfo?.country || wmiInfo.country,
            },
            rawText: parsed.rawText,
          };
        } else {
          return {
            success: false,
            error: `Invalid VIN format: ${cleanVin}`,
            suggestion: 'The detected text does not match VIN format. Please ensure the VIN is clearly visible and retry.',
          };
        }
      } else {
        return {
          success: false,
          error: parsed.issues || 'No VIN detected in the image',
          suggestion: 'Tips: 1) Check door jamb sticker, 2) Dashboard near windshield, 3) Ensure good lighting and focus',
        };
      }
    }
  } catch {
    // JSON parsing failed
  }

  return {
    success: false,
    error: 'Could not parse VIN from image',
    suggestion: 'Please take a clearer photo of the VIN sticker or plate',
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json<VinOcrResponse>(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!validateFileType(file)) {
      return NextResponse.json<VinOcrResponse>(
        { success: false, error: 'Invalid file type. Use JPEG, PNG, or WebP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<VinOcrResponse>(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 413 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const apiProvider = process.env.VISION_API_PROVIDER?.toLowerCase() || 'openai';

    if (!openaiKey && !claudeKey) {
      return NextResponse.json<VinOcrResponse>(
        { success: false, error: 'API key not configured' },
        { status: 503 }
      );
    }

    const imageBase64 = await fileToBase64(file);
    let ocrResult: string;

    const preferClaude = (apiProvider === 'claude' && claudeKey) || (!openaiKey && claudeKey);

    try {
      if (preferClaude) {
        ocrResult = await callClaudeVision(claudeKey!, imageBase64);
      } else {
        ocrResult = await callOpenAIVision(openaiKey!, imageBase64);
      }
    } catch (error) {
      // Fallback to other provider
      try {
        if (preferClaude && openaiKey) {
          ocrResult = await callOpenAIVision(openaiKey, imageBase64);
        } else if (!preferClaude && claudeKey) {
          ocrResult = await callClaudeVision(claudeKey, imageBase64);
        } else {
          throw error;
        }
      } catch {
        const errorMessage = error instanceof Error ? error.message : 'Vision API error';
        return NextResponse.json<VinOcrResponse>(
          { success: false, error: errorMessage },
          { status: 503 }
        );
      }
    }

    const result = parseVinResponse(ocrResult);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<VinOcrResponse>(
      { success: false, error: `Failed to process image: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with image file.' },
    { status: 405 }
  );
}
