/* ============================================
   BrandGuard AR — AI Engine Module
   Google Gemini Vision API integration
   ============================================ */

const AIEngine = (() => {
  const API_KEY_STORAGE = 'brandguard_gemini_key';
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // ---- API Key Management ----

  function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  }

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  }

  function hasApiKey() {
    return getApiKey().length > 0;
  }

  // ---- Core Analysis ----

  async function analyzeImage(imageBase64, brandRules) {
    const apiKey = getApiKey();

    if (!apiKey) {
      console.warn('No Gemini API key set — returning demo findings.');
      return getDemoFindings(brandRules);
    }

    const rulesSummary = BrandConfig.getRulesSummary();

    const prompt = `You are BrandGuard AI, an expert brand compliance auditor for ${brandRules.name}.

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

    try {
      // Strip data URL prefix if present
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

      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', response.status, errorData);

        if (response.status === 400 || response.status === 403) {
          throw new Error('Invalid API key or access denied. Please check your Gemini API key in Settings.');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract text from Gemini response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response (handle possible markdown wrapping)
      let jsonStr = text.trim();

      // Remove markdown code fences if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(jsonStr);

      // Validate structure
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
    } catch (err) {
      console.error('AI analysis failed:', err);

      // Return error info so UI can show it
      if (err.message.includes('API key') || err.message.includes('access denied')) {
        return {
          error: err.message,
          overallScore: 0,
          brandDetected: 'Error',
          findings: [],
          aiPowered: false,
        };
      }

      // Fallback to demo data on other errors
      console.info('Falling back to demo findings.');
      return getDemoFindings(brandRules);
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

    // Generic fallback
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
    hasApiKey,
    analyzeImage,
    getDemoFindings,
  };
})();
