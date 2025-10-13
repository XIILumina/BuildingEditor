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
            'model' => 'gpt-4.1',
        ]);
        \Log::debug("AI Draw Suggestion Request: " . json_encode($request->all()));

        if (!env('OPENAI_API_KEY')) {
            \Log::error("OPENAI_API_KEY is not set in .env");
            return response()->json(['success' => false, 'error' => 'OpenAI API key missing'], 500);
        }

        $client = OpenAI::client(env('OPENAI_API_KEY'));
        $prompt = $request->input('prompt');
        $projectData = json_decode($request->input('projectData'), true);

        // Pre-encode projectData to avoid array-to-string conversion
        $encodedProjectData = json_encode($projectData);

        // System prompt with pre-encoded projectData
        $systemPrompt = <<<EOD
You are an AI assistant that generates JSON data for a drawing application. The JSON must contain arrays of 'strokes' and/or 'shapes' to be rendered on a canvas. The format must match the following:

- Strokes: {id: number, points: number[], color: string, thickness: number, isWall: boolean, layer_id: number, material: string}
- Shapes: 
  - Rect: {id: number, type: "rect", x: number, y: number, width: number, height: number, color: string, rotation: number, layer_id: number}
  - Circle: {id: number, type: "circle", x: number, y: number, radius: number, color: string, rotation: number, layer_id: number}
  - Polygon: {id: number, type: "polygon", points: number[], fill: string, closed: boolean, layer_id: number}

The canvas uses a grid system (default gridSize=10). Coordinates and dimensions should be multiples of 10 for alignment. Colors are hex codes (e.g., "#ff0000"). The current project data is provided to analyze and base suggestions on.

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