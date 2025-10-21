<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use OpenAI;

class OpenAIController extends Controller
{
    public function chat(Request $request)
    {
        $client = OpenAI::client(env('OPENAI_API_KEY'));

        $prompt = $request->input('prompt');
        $promptBlocks = str_split($prompt, 500);

        $messages = [
            ['role' => 'system', 'content' => 'You are GPT Assistant']
        ];

        foreach ($promptBlocks as $block) {
            $messages[] = ['role' => 'user', 'content' => $block];
        }

        try {
            $response = $client->chat()->create([
                'model' => 'gpt-4.1',
                'messages' => $messages,
            ]);
            \Log::debug("OpenAI response: " . json_encode($response));

            return response()->json([
                'reply' => $response->choices[0]->message->content,
            ]);
        } catch (\Throwable $e) {
            \Log::error("OpenAI error: " . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function promptblock(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);
        $promptblock = $request->input('prompt');   
        $promptblock = str_split($promptblock, 500);
        return response()->json(['promptblock' => $promptblock]);
    }

    public function AiDrawSuggestion(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
            'projectData' => 'required|json',
            'model' => 'gpt-5',
        ]);
        \Log::debug("AI Draw Suggestion Request: " . json_encode($request->all()));

        if (!env('OPENAI_API_KEY')) {
            return response()->json(['success' => false, 'error' => 'OpenAI API key missing'], 500);
        }

        $client = OpenAI::client(env('OPENAI_API_KEY'));
        $prompt = $request->input('prompt');
        $projectData = json_decode($request->input('projectData'), true);

        // Pre-encode projectData to avoid array-to-string conversion
        $encodedProjectData = json_encode($projectData);

        // System prompt with pre-encoded projectData
        $systemPrompt = <<<EOD
You are an AI assistant for a drawing app. Your job is to generate valid JSON for canvas objects. 
Output ONLY a JSON object, wrapped in ```json ... ``` (no explanations, no comments).

Format:
{
  "strokes": [
    {"id": 1, "points": [10,10, 100,10], "color": "#ff0000", "thickness": 10, "isWall": true, "layer_id": 1}
  ],
  "shapes": [
    {"id": 2, "type": "rect", "x": 20, "y": 20, "width": 100, "height": 60, "color": "#00ff00", "rotation": 0, "layer_id": 1},
    {"id": 3, "type": "circle", "x": 200, "y": 200, "radius": 40, "color": "#0000ff", "rotation": 0, "layer_id": 1},
    {"id": 4, "type": "polygon", "points": [10,10, 60,10, 60,60, 10,60], "fill": "#cccccc", "closed": true, "layer_id": 1}
  ]
}
you can adjust the size of polygons, circles and rectangles accordingly, just keep in mind the JSOn structure. 

Rules:
- Use only valid hex colors.
- All coordinates and sizes must be multiples of 10.
- Do not include any text outside the JSON block.
- If the prompt asks for a room, make sure walls form a closed loop.
- If you add furniture, place it inside rooms.

Current project data:
```json
{$encodedProjectData}
```

User prompt: "{$prompt}"

Generate a JSON object with 'strokes' and 'shapes' arrays. Ensure the JSON is valid and matches the canvas format. If the prompt requests a room or walls, ensure walls form closed loops where possible. If analyzing the project, suggest additions that complement existing elements (e.g., add furniture to a room). Return only the JSON object, wrapped in ```json``` markers.
EOD;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        try {
            $response = $client->chat()->create([
                'model' => 'gpt-4.1',
                'messages' => $messages,
            ]);

            if (!isset($response->choices) || empty($response->choices) || !isset($response->choices[0]->message->content)) {
                \Log::error("Invalid OpenAI response structure: " . json_encode($response));
                throw new \Exception("Invalid response from OpenAI API");
            }

            $content = $response->choices[0]->message->content;
            \Log::debug("OpenAI response content: " . $content);

            $jsonString = $content;
            if (strpos($content, '```json') !== false && strrpos($content, '```') !== false) {
                $jsonStart = strpos($content, '```json') + 7;
                $jsonEnd = strrpos($content, '```');
                $jsonString = substr($content, $jsonStart, $jsonEnd - $jsonStart);
            }

            $jsonData = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                \Log::error("Invalid JSON from AI: " . $jsonString);
                throw new \Exception("Invalid JSON generated by AI");
            }

            return response()->json([
                'success' => true,
                'data' => $jsonData,
            ]);
        } catch (\Throwable $e) {
            \Log::error("OpenAI draw suggestion error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}