import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = false } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Gemini chat request:', { messageCount: messages?.length, stream });

    // System prompt for collision prevention and rider assistance
    const systemPrompt = `You are RiderGuard AI, an advanced collision prevention and rider assistance system. Your role is to:

1. Monitor sensor data and provide real-time safety alerts
2. Analyze riding patterns and suggest improvements
3. Warn about potential hazards based on acceleration, gyroscope, and location data
4. Provide navigation assistance and route optimization
5. Give emergency response guidance if needed
6. Offer riding tips based on current conditions

Be concise, clear, and prioritize safety. Always respond in a helpful, professional manner. When analyzing sensor data, provide specific actionable insights. If you detect dangerous patterns (sudden braking, sharp turns, high acceleration), immediately warn the rider.

Respond in a conversational tone but always prioritize critical safety information first.`;

    const formattedMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ];

    const url = stream 
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', response.status, error);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    return new Response(
      JSON.stringify({ response: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
