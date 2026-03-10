/* ============================================
   BrandGuard AR — AI Engine Module
   Gemini Vision API
   ============================================ */

const AIEngine = (() => {
  const GEMINI_KEY_STORAGE = 'brandguard_gemini_key';

  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // ---- API Key Management ----

  function setApiKey(key) {
    key = key.trim();
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
  }

  function getApiKey() {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  }

  function getGeminiKey() {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  }

  function hasApiKey() {
    return getGeminiKey().length > 0;
  }

  function getActiveProvider() {
    if (getGeminiKey()) return 'gemini';
    return 'demo';
  }

  // ---- Prompt Builder ----

  function buildPrompt(brandRules) {
    const rulesSummary = BrandConfig.getRulesSummary();
    return `You are BrandGuard AI, an expert brand compliance auditor for ${brandRules.name}.

BRAND GUIDELINES:
${rulesSummary}

TASK:
Analyze the uploaded image of a physical branded asset (signage, poster, product packaging, shop facade, etc.) and check compliance against the brand guidelines above.

For each aspect, determine if it PASSES, has a WARNING (minor deviation), or FAILS (major violation).

You MUST return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no explanation outside the JSON):

{
  "overallScore": <number 0-100>,
  "brandDetected": "<name of brand detected in image, or 'Unknown'>",
  "findings": [
    {
      "category": "<one of: Logo Placement, Color Accuracy, Font Usage, Layout & Spacing, Brand Elements, Unauthorized Content>",
      "status": "<one of: pass, warning, fail>",
      "description": "<what you found — be specific>",
      "suggestion": "<how to fix it, or 'N/A' if pass>",
      "confidence": <number 0-100>,
      "details": {
        "foundValue": "<what you detected, e.g. a hex color or font name>",
        "expectedValue": "<what the brand requires>"
      }
    }
  ]
}

IMPORTANT RULES:
- Always check: (1) Logo visibility & placement, (2) Color accuracy, (3) Font usage, (4) Overall layout/spacing, (5) Any unauthorized or competitor elements
- Be honest — if the brand isn't clearly visible, say so
- Return at least 3 findings, up to 8
- overallScore should reflect the weighted average of all findings
- Return ONLY the JSON object, nothing else`;
  }

  // ---- Parse & Validate AI Response ----

  function parseAndValidate(text) {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const result = JSON.parse(jsonStr);
    if (!result.findings || !Array.isArray(result.findings)) {
      throw new Error('Invalid AI response structure');
    }
    return {
      overallScore: result.overallScore || 0,
      brandDetected: result.brandDetected || 'Unknown',
      findings: result.findings.map(f => ({
        category: f.category || 'Unknown',
        status: ['pass', 'warning', 'fail'].includes(f.status) ? f.status : 'warning',
        description: f.description || 'No description available.',
        suggestion: f.suggestion || 'N/A',
        confidence: f.confidence || 50,
        details: {
          foundValue: f.details?.foundValue || '',
          expectedValue: f.details?.expectedValue || '',
        },
      })),
      aiPowered: true,
    };
  }

  // ---- Gemini Vision API (with retry) ----

  async function analyzeWithGemini(imageBase64, brandRules, retries = 2) {
    const apiKey = getGeminiKey();
    const prompt = buildPrompt(brandRules);

    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return parseAndValidate(text);
      }

      if (response.status === 429) {
        if (attempt < retries) {
          // Exponential backoff: 2s, 4s
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`Gemini rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${retries})`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw new Error('RATE_LIMIT: Gemini free tier quota exceeded. Please wait a minute and retry.');
      }

      if (response.status === 400 || response.status === 403) {
        throw new Error('INVALID_KEY: Invalid Gemini API key or access denied. Please check your key in Settings.');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status}`);
    }
  }

  // ---- Core Analysis (auto-selects provider) ----

  async function analyzeImage(imageBase64, brandRules) {
    const provider = getActiveProvider();

    if (provider === 'demo') {
      console.warn('No API key set — returning demo findings.');
      return getDemoFindings(brandRules);
    }

    try {
      console.log('Using Gemini Vision API...');
      return await analyzeWithGemini(imageBase64, brandRules);
    } catch (err) {
      console.error('AI analysis failed:', err);

      // User-friendly error messages
      let userMessage = err.message;
      if (err.message.includes('RATE_LIMIT')) {
        userMessage = err.message.replace('RATE_LIMIT: ', '');
      } else if (err.message.includes('INVALID_KEY')) {
        userMessage = err.message.replace('INVALID_KEY: ', '');
      } else if (err.message.includes('Failed to fetch')) {
        userMessage = 'Network error — make sure you are running this from a web server (not file://) and have internet access.';
      }

      return {
        error: userMessage,
        overallScore: 0,
        brandDetected: 'Error',
        findings: [],
        aiPowered: false,
      };
    }
  }

  // ---- Demo Fallback ----

  function getDemoFindings(brandRules) {
    const rules = brandRules || BrandConfig.getActiveRules();
    const isSafaricom = rules.id === 'safaricom';
    const isCocaCola = rules.id === 'cocacola';

    if (isSafaricom) {
      return {
        overallScore: 72,
        brandDetected: 'Safaricom',
        findings: [
          {
            category: 'Logo Placement',
            status: 'pass',
            description: 'Safaricom logo is clearly visible with adequate clear space on all sides.',
            suggestion: 'N/A',
            confidence: 92,
            details: { foundValue: 'Logo detected — top center', expectedValue: 'Visible with 1.5x clear space' },
          },
          {
            category: 'Color Accuracy',
            status: 'warning',
            description: 'Primary green is close but slightly lighter than Safaricom Green (#4CAF50). Detected #5EC762.',
            suggestion: 'Adjust green to exact Safaricom Green (#4CAF50) for brand consistency.',
            confidence: 85,
            details: { foundValue: '#5EC762', expectedValue: '#4CAF50' },
          },
          {
            category: 'Font Usage',
            status: 'fail',
            description: 'Body text appears to use a generic sans-serif (Arial) instead of Safaricom Sans.',
            suggestion: 'Replace all body text with Safaricom Sans Regular font.',
            confidence: 78,
            details: { foundValue: 'Arial', expectedValue: 'Safaricom Sans Regular' },
          },
          {
            category: 'Brand Elements',
            status: 'warning',
            description: 'Tagline "The Better Option" is present but uses incorrect capitalization.',
            suggestion: 'Ensure tagline follows exact approved capitalization and styling.',
            confidence: 88,
            details: { foundValue: 'THE BETTER OPTION', expectedValue: 'The Better Option' },
          },
        ],
        aiPowered: false,
      };
    }

    if (isCocaCola) {
      return {
        overallScore: 68,
        brandDetected: 'Coca-Cola',
        findings: [
          {
            category: 'Logo Placement',
            status: 'pass',
            description: 'Classic Coca-Cola Spencerian script logo is visible and correctly oriented.',
            suggestion: 'N/A',
            confidence: 95,
            details: { foundValue: 'Logo detected — center', expectedValue: 'Spencerian script visible' },
          },
          {
            category: 'Color Accuracy',
            status: 'fail',
            description: 'Coca-Cola Red appears too dark/crimson. Detected #C41200 instead of brand red #F40009.',
            suggestion: 'Use exact Coca-Cola Red (#F40009). Avoid dark reds or maroons.',
            confidence: 90,
            details: { foundValue: '#C41200', expectedValue: '#F40009' },
          },
          {
            category: 'Font Usage',
            status: 'warning',
            description: 'Secondary text uses Helvetica instead of TCCC Unity.',
            suggestion: 'Replace with TCCC Unity Regular for all non-logo text.',
            confidence: 72,
            details: { foundValue: 'Helvetica', expectedValue: 'TCCC Unity Regular' },
          },
          {
            category: 'Brand Elements',
            status: 'fail',
            description: 'Dynamic Ribbon device is not present. Required on all primary marketing materials.',
            suggestion: 'Add the Dynamic Ribbon device in an approved position per brand guidelines.',
            confidence: 84,
            details: { foundValue: 'Not detected', expectedValue: 'Dynamic Ribbon present' },
          },
          {
            category: 'Unauthorized Content',
            status: 'pass',
            description: 'No competitor brand elements detected in the image.',
            suggestion: 'N/A',
            confidence: 91,
            details: { foundValue: 'None detected', expectedValue: 'No competitors' },
          },
        ],
        aiPowered: false,
      };
    }

    return {
      overallScore: 75,
      brandDetected: rules.name || 'Unknown Brand',
      findings: [
        {
          category: 'Logo Placement',
          status: 'pass',
          description: 'Brand logo is present and correctly positioned with proper clear space.',
          suggestion: 'N/A',
          confidence: 88,
          details: { foundValue: 'Logo detected', expectedValue: 'Logo visible' },
        },
        {
          category: 'Color Accuracy',
          status: 'warning',
          description: `Primary color deviates slightly from brand standard ${rules.colors?.primary || '#000'}.`,
          suggestion: `Use exact brand primary color ${rules.colors?.primary || '#000'}.`,
          confidence: 80,
          details: { foundValue: '#E33333', expectedValue: rules.colors?.primary || '#FF0000' },
        },
        {
          category: 'Font Usage',
          status: 'fail',
          description: `Text uses generic fonts instead of ${rules.fonts?.heading || 'brand font'}.`,
          suggestion: `Replace with ${rules.fonts?.body || 'approved brand font'}.`,
          confidence: 75,
          details: { foundValue: 'Arial', expectedValue: rules.fonts?.body || 'Brand Font' },
        },
      ],
      aiPowered: false,
    };
  }

  return {
    setApiKey,
    getApiKey,
    getGeminiKey,
    hasApiKey,
    getActiveProvider,
    analyzeImage,
    getDemoFindings,
  };
})();
