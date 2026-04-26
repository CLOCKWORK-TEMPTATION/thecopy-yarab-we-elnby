import { platformGenAIService } from '@/services/platform-genai.service';

interface DesignBrief {
  projectType: string;
  sceneContext: string;
  characterProfile: string;
  psychologicalState: string;
  filmingLocation: string;
  productionConstraints: string;
}

interface StyleistActionRequest {
  action: string;
  data?: Record<string, unknown>;
}

interface WeatherInfo {
  temp: number;
  condition: string;
  location: string;
  sources?: string[];
}

interface OpenMeteoPlace {
  name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoPlace[];
}

interface OpenMeteoForecastResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: string | number;
  };
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getRequiredText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toDesignBrief(value: unknown): DesignBrief {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  return {
    projectType: getRequiredText(record["projectType"]),
    sceneContext: getRequiredText(record["sceneContext"]),
    characterProfile: getRequiredText(record["characterProfile"]),
    psychologicalState: getRequiredText(record["psychologicalState"]),
    filmingLocation: getRequiredText(record["filmingLocation"]),
    productionConstraints: getRequiredText(record["productionConstraints"]),
  };
}

function isDataUrl(input: string): boolean {
  return input.startsWith('data:');
}

async function resolveImageSource(input: string): Promise<{ data: string; mimeType: string }> {
  if (isDataUrl(input)) {
    const [metadata, payload] = input.split(',', 2);
    const mimeType = metadata?.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
    return { data: payload ?? '', mimeType };
  }

  const response = await fetch(input);
  if (!response["ok"]) {
    throw new Error(`Failed to fetch source image: ${response["status"]}`);
  }

  const mimeType = response.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    data: buffer.toString('base64'),
    mimeType,
  };
}

// eslint-disable-next-line complexity
async function loadWeather(location: string): Promise<WeatherInfo> {
  if (!location.trim()) {
    return {
      temp: 0,
      condition: 'Unavailable',
      location: '',
      sources: ['Weather lookup skipped: empty location'],
    };
  }

  try {
    const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geocodeUrl.searchParams.set('name', location);
    geocodeUrl.searchParams.set('count', '1');
    geocodeUrl.searchParams.set('language', 'en');
    geocodeUrl.searchParams.set('format', 'json');
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeJson = (await geocodeResponse.json()) as OpenMeteoGeocodeResponse;
    const place = geocodeJson?.results?.[0];

    if (
      !place ||
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    ) {
      return {
        temp: 0,
        condition: 'Unavailable',
        location,
        sources: ['Weather lookup failed: location not found'],
      };
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', String(place.latitude));
    forecastUrl.searchParams.set('longitude', String(place.longitude));
    forecastUrl.searchParams.set('current', 'temperature_2m,weather_code');
    forecastUrl.searchParams.set('temperature_unit', 'fahrenheit');
    const forecastResponse = await fetch(forecastUrl);
    const forecastJson = (await forecastResponse.json()) as OpenMeteoForecastResponse;

    return {
      temp: Number(forecastJson?.current?.temperature_2m) || 0,
      condition: `Weather code ${forecastJson?.current?.weather_code ?? 'unknown'}`,
      location: `${place.name}${place.country ? `, ${place.country}` : ''}`,
      sources: [geocodeUrl.toString(), forecastUrl.toString()],
    };
  } catch {
    return {
      temp: 0,
      condition: 'Unavailable',
      location,
      sources: ['Weather lookup failed'],
    };
  }
}

export class StyleistService {
  async execute(request: StyleistActionRequest): Promise<Record<string, unknown>> {
    const data = request.data ?? {};

    switch (request.action) {
      case 'generateDesign':
        return this.generateDesign(toDesignBrief(data["brief"]));
      case 'transcribeAudio':
        return this.transcribeAudio(
          getOptionalString(data["audioBase64"]),
          getOptionalString(data["mimeType"])
        );
      case 'analyzeVideo':
        return this.analyzeVideo(
          getOptionalString(data["videoBase64"]),
          getOptionalString(data["mimeType"])
        );
      case 'generateGarment':
        return this.generateGarment(
          getOptionalString(data["prompt"]),
          getOptionalString(data["size"])
        );
      case 'generateVirtualFit':
        return this.generateVirtualFit(data);
      case 'editGarment':
        return this.editGarment(
          getOptionalString(data["imageUrl"]),
          getOptionalString(data["editPrompt"])
        );
      case 'refineScreenplay':
        return this.refineScreenplay(data["lines"]);
      default:
        throw new Error('Unknown styleIST action');
    }
  }

  private async generateDesign(brief: DesignBrief): Promise<Record<string, unknown>> {
    const weather = await loadWeather(brief?.filmingLocation || '');
    const prompt = `You are an expert costume stylist for film and television.

Return ONLY valid JSON with this shape:
{
  "lookTitle": "string",
  "dramaticDescription": "string",
  "breakdown": {
    "basics": "string",
    "layers": "string",
    "shoes": "string",
    "accessories": "string",
    "materials": "string",
    "colorPalette": "string"
  },
  "rationale": ["string"],
  "productionNotes": {
    "copies": "string",
    "distressing": "string",
    "cameraWarnings": "string",
    "weatherAlt": "string",
    "budgetAlt": "string"
  },
  "imagePrompt": "string"
}

Use professional Egyptian Arabic for content values. Reflect the character psychology, camera needs, and production constraints.

Brief:
${JSON.stringify({ ...brief, weather }, null, 2)}`;

    const result = await platformGenAIService.generateJson<Record<string, unknown>>(prompt, {
      temperature: 0.45,
      maxOutputTokens: 8192,
    });

    const imagePrompt =
      typeof result["imagePrompt"] === 'string' && result["imagePrompt"].trim()
        ? result["imagePrompt"]
        : `Cinematic costume concept art for ${brief.characterProfile}. Scene context: ${brief.sceneContext}.`;

    const conceptArtUrl = await platformGenAIService.generateImage(imagePrompt);

    return {
      lookTitle: result["lookTitle"] || 'تصميم مخصص',
      dramaticDescription: result["dramaticDescription"] || '',
      breakdown: result["breakdown"] || {},
      rationale: Array.isArray(result["rationale"]) ? result["rationale"] : [],
      productionNotes: result["productionNotes"] || {},
      imagePrompt,
      conceptArtUrl,
      realWeather: weather,
    };
  }

  private async transcribeAudio(audioBase64?: string, mimeType?: string): Promise<Record<string, unknown>> {
    if (!audioBase64 || !mimeType) {
      throw new Error('Audio payload is required.');
    }

    const text = await platformGenAIService.generateTextFromMedia(
      'Transcribe this audio accurately and focus on costume-design or creative notes.',
      { data: audioBase64, mimeType },
      { temperature: 0.1, maxOutputTokens: 4096 }
    );

    return { text };
  }

  private async analyzeVideo(videoBase64?: string, mimeType?: string): Promise<Record<string, unknown>> {
    if (!videoBase64 || !mimeType) {
      throw new Error('Video payload is required.');
    }

    const analysis = await platformGenAIService.generateTextFromMedia(
      'Analyze this video for costume design inspiration. Describe colors, textures, silhouettes, movement, and mood in Egyptian Arabic.',
      { data: videoBase64, mimeType },
      { temperature: 0.35, maxOutputTokens: 4096 }
    );

    return { analysis };
  }

  private async generateGarment(prompt?: string, size?: string): Promise<Record<string, unknown>> {
    if (!prompt || !prompt.trim()) {
      throw new Error('Garment prompt is required.');
    }

    const description = await platformGenAIService.generateText(
      `Describe in Egyptian Arabic a production-ready garment based on this prompt: ${prompt}. Mention fabric, silhouette, and styling notes. Requested size tier: ${size || '2K'}.`,
      { temperature: 0.5, maxOutputTokens: 2048 }
    );
    const imageUrl = await platformGenAIService.generateImage(
      `${prompt}. Fashion product shot, transparent background, premium studio lighting.`
    );

    return { description, imageUrl };
  }

  private async generateVirtualFit(data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const prompt = `You are a wardrobe fitting analyst. Based on this payload, estimate fit compatibility and movement safety.

Return ONLY valid JSON:
{
  "compatibilityScore": 0,
  "safetyIssues": ["string"],
  "fabricNotes": "string",
  "movementPrediction": "string"
}

Payload:
${JSON.stringify(data ?? {}, null, 2)}`;

    return platformGenAIService.generateJson<Record<string, unknown>>(prompt, {
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
  }

  private async editGarment(imageUrl?: string, editPrompt?: string): Promise<Record<string, unknown>> {
    if (!imageUrl || !editPrompt) {
      throw new Error('Source image and edit prompt are required.');
    }

    const source = await resolveImageSource(imageUrl);
    const description = await platformGenAIService.generateText(
      `Describe in Egyptian Arabic the requested wardrobe edit and the intended visual result: ${editPrompt}`,
      { temperature: 0.35, maxOutputTokens: 2048 }
    );
    const editedImageUrl = await platformGenAIService.editImage(editPrompt, source);

    return {
      description,
      imageUrl: editedImageUrl,
    };
  }

  private async refineScreenplay(lines?: unknown): Promise<Record<string, unknown>> {
    const prompt = `You are an Arabic screenplay formatter.

Return ONLY valid JSON:
{
  "lines": [
    {
      "text": "string",
      "type": "scene-header-1"
    }
  ]
}

Lines:
${JSON.stringify(lines ?? [])}`;

    return platformGenAIService.generateJson<Record<string, unknown>>(prompt, {
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
  }
}

export const styleistService = new StyleistService();
