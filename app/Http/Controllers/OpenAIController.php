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
            'model' => 'nullable|string'
        ]);
        \Log::debug("AI Draw Suggestion Request: " . json_encode($request->all()));

        if (!env('OPENAI_API_KEY')) {
            \Log::error("OPENAI_API_KEY is not set in .env");
            return response()->json(['success' => false, 'error' => 'OpenAI API key missing'], 500);
        }

        $client = OpenAI::client(env('OPENAI_API_KEY'));
        $prompt = $request->input('prompt');
        $projectData = json_decode($request->input('projectData'), true);

        // Extract grid and active layer for normalization
        $gridSize = (int)($projectData['gridSize'] ?? 10);
        if ($gridSize < 2) $gridSize = 10;
        if ($gridSize > 200) $gridSize = 200;
        $activeLayerId = (int)($projectData['activeLayerId'] ?? ($projectData['layers'][0]['id'] ?? 1));

        $encodedProjectData = json_encode($projectData);

        // Tighter system prompt + schema + examples
        $systemPrompt = <<<EOD
You produce only valid JSON for a floorplan canvas. Snap all coordinates to a grid (gridSize multiples, default 10). Prefer axis-aligned shapes, orthogonal walls, and closed polygons where appropriate.

Output format:
{
  "strokes": [
    {"id": number, "points": number[], "color": "#RRGGBB", "thickness": number, "isWall": boolean, "layer_id": number, "material": string, "rotation": number}
  ],
  "shapes": [
    // Rect
    {"id": number, "type": "rect", "x": number, "y": number, "width": number, "height": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    // Circle
    {"id": number, "type": "circle", "x": number, "y": number, "radius": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    // Oval (ellipse)
    {"id": number, "type": "oval", "x": number, "y": number, "radiusX": number, "radiusY": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    // Polygon (filled area like room/furniture)
    {"id": number, "type": "polygon", "points": number[], "fill": "#RRGGBB", "closed": true, "layer_id": number, "rotation": number}
  ]
}

Rules:
- Use only the fields shown above. Do not include other keys.
- Numbers must be integers (multiples of gridSize).
- Colors must be hex (#rrggbb).
- points is an even-length array: [x1,y1,x2,y2,...]; for polygons use >= 6 values (>= 3 vertices).
- For rooms: prefer polygon with closed=true, or rects for axis-aligned rooms.
- For walls: use strokes with isWall=true, straight segments, endpoints aligned on the grid.
- Use the existing layer_id when appropriate (fall back to the active layer id).

Context:
gridSize: {$gridSize}
Current project data:
{$encodedProjectData}

Produce only a JSON object. No markdown fences.
EOD;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        try {
            $response = $client->chat()->create([
                'model' => $request->input('model', 'gpt-4.1'),
                'messages' => $messages,
                'temperature' => 0.15,
                'top_p' => 0.95,
                // Force JSON (many models honor this)
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 1200,
            ]);

            if (!isset($response->choices[0]->message->content)) {
                \Log::error("Invalid OpenAI response structure: " . json_encode($response));
                throw new \Exception("Invalid response from OpenAI API");
            }

            $content = $response->choices[0]->message->content;
            \Log::debug("OpenAI response content: " . $content);

            // When response_format=json_object, content is already raw JSON
            $jsonString = $content;
            // Fallback if the model ignored json_object and used ```json
            if (strpos($content, '```json') !== false && strrpos($content, '```') !== false) {
                $start = strpos($content, '```json') + 7;
                $end = strrpos($content, '```');
                $jsonString = substr($content, $start, $end - $start);
            }

            $raw = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($raw)) {
                \Log::error("Invalid JSON from AI: " . $jsonString);
                throw new \Exception("Invalid JSON generated by AI");
            }

            // Normalize/validate/snap before returning to FE
            $clean = $this->normalizeAiDrawing($raw, $activeLayerId, $gridSize);

            return response()->json([
                'success' => true,
                'data' => $clean,
            ]);
        } catch (\Throwable $e) {
            \Log::error("OpenAI draw suggestion error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // --- Helpers ---

    private function normalizeAiDrawing(array $data, int $activeLayerId, int $gridSize): array
    {
        $hex = '/^#([A-Fa-f0-9]{6})$/';
        $snap = function ($n) use ($gridSize) {
            if (!is_numeric($n)) return 0;
            return (int)round(((float)$n) / $gridSize) * $gridSize;
        };
        $clamp = function ($n, $min, $max) {
            $n = (int)$n;
            if ($n < $min) return $min;
            if ($n > $max) return $max;
            return $n;
        };
        $evenPoints = function ($pts) {
            return is_array($pts) && count($pts) % 2 === 0 && count($pts) >= 6;
        };
        $snapPoints = function ($pts) use ($snap) {
            $out = [];
            for ($i = 0; $i < count($pts); $i += 2) {
                $out[] = $snap($pts[$i] ?? 0);
                $out[] = $snap($pts[$i + 1] ?? 0);
            }
            return $out;
        };

        $outStrokes = [];
        foreach (($data['strokes'] ?? []) as $s) {
            if (!is_array($s)) continue;
            $pts = $s['points'] ?? null;
            if (!is_array($pts) || count($pts) < 4) continue;

            $color = is_string($s['color'] ?? null) && preg_match($hex, $s['color']) ? $s['color'] : '#9ca3af';
            $thickness = isset($s['thickness']) ? (int)$s['thickness'] : 2;
            if ($thickness < 1) $thickness = 1;
            if ($thickness > 200) $thickness = 200;

            $outStrokes[] = [
                'id' => $s['id'] ?? (int) (microtime(true) * 1000),
                'points' => $snapPoints($pts),
                'color' => $color,
                'thickness' => $thickness,
                'isWall' => (bool)($s['isWall'] ?? false),
                'layer_id' => isset($s['layer_id']) ? (int)$s['layer_id'] : $activeLayerId,
                'material' => isset($s['material']) && is_string($s['material']) ? $s['material'] : null,
                'rotation' => isset($s['rotation']) ? (float)$s['rotation'] : 0,
            ];
        }

        $outShapes = [];
        foreach (($data['shapes'] ?? []) as $sh) {
            if (!is_array($sh)) continue;
            $type = strtolower((string)($sh['type'] ?? ''));
            if ($type === 'ellipse') $type = 'oval';
            $layerId = isset($sh['layer_id']) ? (int)$sh['layer_id'] : $activeLayerId;
            $rotation = isset($sh['rotation']) ? (float)$sh['rotation'] : 0;

            if ($type === 'rect') {
                $x = $snap($sh['x'] ?? 0);
                $y = $snap($sh['y'] ?? 0);
                $w = $snap($sh['width'] ?? 0);
                $h = $snap($sh['height'] ?? 0);
                if ($w < $gridSize / 2 || $h < $gridSize / 2) continue;
                $color = is_string($sh['color'] ?? null) && preg_match($hex, $sh['color']) ? $sh['color'] : '#9ca3af';
                $outShapes[] = [
                    'id' => $sh['id'] ?? (int) (microtime(true) * 1000),
                    'type' => 'rect',
                    'x' => $x, 'y' => $y,
                    'width' => $w, 'height' => $h,
                    'color' => $color,
                    'rotation' => $rotation,
                    'layer_id' => $layerId,
                ];
                continue;
            }

            if ($type === 'circle') {
                $x = $snap($sh['x'] ?? 0);
                $y = $snap($sh['y'] ?? 0);
                $r = $snap($sh['radius'] ?? 0);
                if ($r < $gridSize / 2) continue;
                $color = is_string($sh['color'] ?? null) && preg_match($hex, $sh['color']) ? $sh['color'] : '#9ca3af';
                $outShapes[] = [
                    'id' => $sh['id'] ?? (int) (microtime(true) * 1000),
                    'type' => 'circle',
                    'x' => $x, 'y' => $y,
                    'radius' => $r,
                    'color' => $color,
                    'rotation' => $rotation,
                    'layer_id' => $layerId,
                ];
                continue;
            }

            if ($type === 'oval') {
                $x = $snap($sh['x'] ?? 0);
                $y = $snap($sh['y'] ?? 0);
                $rx = $snap($sh['radiusX'] ?? ($sh['rx'] ?? 0));
                $ry = $snap($sh['radiusY'] ?? ($sh['ry'] ?? 0));
                if ($rx < $gridSize / 2 || $ry < $gridSize / 2) continue;
                $color = is_string($sh['color'] ?? null) && preg_match($hex, $sh['color']) ? $sh['color'] : '#9ca3af';
                $outShapes[] = [
                    'id' => $sh['id'] ?? (int) (microtime(true) * 1000),
                    'type' => 'oval',
                    'x' => $x, 'y' => $y,
                    'radiusX' => $rx, 'radiusY' => $ry,
                    'color' => $color,
                    'rotation' => $rotation,
                    'layer_id' => $layerId,
                ];
                continue;
            }

            if ($type === 'polygon') {
                $pts = $sh['points'] ?? null;
                if (!$this->isNumericArray($pts)) continue;
                $pts = array_map(fn($v) => $snap($v), $pts);
                if (!$evenPoints($pts)) continue;
                $fill = is_string($sh['fill'] ?? null) && preg_match($hex, $sh['fill']) ? $sh['fill'] : '#9ca3af';
                $outShapes[] = [
                    'id' => $sh['id'] ?? (int) (microtime(true) * 1000),
                    'type' => 'polygon',
                    'points' => $pts,
                    'fill' => $fill,
                    'closed' => true,
                    'layer_id' => $layerId,
                    'rotation' => $rotation,
                ];
                continue;
            }

            // Ignore unsupported types
        }

        return [
            'strokes' => array_values($outStrokes),
            'shapes' => array_values($outShapes),
        ];
    }

    private function isNumericArray($arr): bool
    {
        if (!is_array($arr)) return false;
        foreach ($arr as $v) {
            if (!is_numeric($v)) return false;
        }
        return true;
    }
}