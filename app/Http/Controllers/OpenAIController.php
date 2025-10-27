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

        $gridSize = (int)($projectData['gridSize'] ?? 10);
        if ($gridSize < 2) $gridSize = 10;
        if ($gridSize > 200) $gridSize = 200;
        $activeLayerId = (int)($projectData['activeLayerId'] ?? ($projectData['layers'][0]['id'] ?? 1));

        $limits = [
            'max_strokes' => (int) env('AI_MAX_STROKES', 60),
            'max_shapes' => (int) env('AI_MAX_SHAPES', 80),
            'max_points_per_stroke' => (int) env('AI_MAX_POINTS_PER_STROKE', 200),
            'max_points_per_polygon' => (int) env('AI_MAX_POINTS_PER_POLYGON', 200),
            'max_total_points' => (int) env('AI_MAX_TOTAL_POINTS', 4000),
        ];

        $encodedProjectData = json_encode($projectData);

        // Clean, comment-free format instructions + explicit wall rounding
        $systemPrompt = <<<EOD
You produce only valid JSON for a floorplan canvas. Snap all coordinates to a grid (multiples of gridSize, default 10). Round all wall endpoints to grid multiples. Prefer axis-aligned shapes, orthogonal walls, and closed polygons.

HARD LIMITS (do not exceed):
- Max strokes: {$limits['max_strokes']}
- Max shapes: {$limits['max_shapes']}
- Max points per stroke: {$limits['max_points_per_stroke']}
- Max points per polygon: {$limits['max_points_per_polygon']}
- Max total points: {$limits['max_total_points']}
If you would exceed a limit, simplify to stay within limits.

Output format (no comments, only these keys):
{
  "strokes": [
    {"id": number, "points": number[], "color": "#RRGGBB", "thickness": number, "isWall": boolean, "layer_id": number, "material": string, "rotation": number}
  ],
  "shapes": [
    {"id": number, "type": "rect", "x": number, "y": number, "width": number, "height": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    {"id": number, "type": "circle", "x": number, "y": number, "radius": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    {"id": number, "type": "oval", "x": number, "y": number, "radiusX": number, "radiusY": number, "color": "#RRGGBB", "rotation": number, "layer_id": number},
    {"id": number, "type": "polygon", "x": number, "y": number, "points": number[], "fill": "#RRGGBB", "color": "#RRGGBB", "closed": true, "layer_id": number, "rotation": number}
  ]
}

Rules:
- Use only the keys shown above. No extra keys, no comments.
- All numbers are integers and multiples of gridSize.
- Colors are hex (#rrggbb).
- points arrays are even-length; polygons use >= 6 values.
- For polygons: set x,y to min x/y of bbox; make points relative to (0,0).
- For walls: use strokes with isWall=true, straight segments, grid-aligned endpoints.
- Use existing layer_id when appropriate; otherwise use activeLayerId.

Context:
gridSize: {$gridSize}
Current project data:
{$encodedProjectData}

Return only a JSON object. No markdown fences.
EOD;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        $model = $request->input('model', env('AI_MODEL', 'gpt-4.1'));
        $maxTokens = (int) env('AI_MAX_TOKENS', 4096);

        try {
            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $messages,
                'temperature' => (float) env('AI_TEMPERATURE', 0.15),
                'top_p' => 0.95,
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => $maxTokens,
            ]);

            if (!isset($response->choices[0]->message->content)) {
                \Log::error("Invalid OpenAI response structure: " . json_encode($response));
                throw new \Exception("Invalid response from OpenAI API");
            }

            $content = $response->choices[0]->message->content;
            \Log::debug("OpenAI response content: " . $content);

            $jsonString = $content;
            if (strpos($content, '```json') !== false && strrpos($content, '```') !== false) {
                $start = strpos($content, '```json') + 7;
                $end = strrpos($content, '```');
                $jsonString = substr($content, $start, $end - $start);
            }

            $raw = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($raw)) {
                // Retry once with stricter caps to avoid truncation
                \Log::warning("AI JSON invalid, retrying with tighter limits.");
                $tightLimits = $limits;
                $tightLimits['max_strokes'] = min($limits['max_strokes'], 20);
                $tightLimits['max_shapes'] = min($limits['max_shapes'], 30);
                $retrySystem = $this->tightPrompt($gridSize, $encodedProjectData, $tightLimits);
                $retryMessages = [
                    ['role' => 'system', 'content' => $retrySystem],
                    ['role' => 'user', 'content' => 'Your previous output was invalid or cut off. Return a smaller JSON object within the limits.'],
                ];
                $retryResp = $client->chat()->create([
                    'model' => $model,
                    'messages' => $retryMessages,
                    'temperature' => (float) env('AI_TEMPERATURE', 0.15),
                    'top_p' => 0.95,
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens' => $maxTokens,
                ]);
                $retryContent = $retryResp->choices[0]->message->content ?? '';
                \Log::debug("OpenAI retry content: " . $retryContent);
                $raw = json_decode($retryContent, true);
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($raw)) {
                    \Log::error("Invalid JSON from AI (retry).");
                    throw new \Exception("Invalid JSON generated by AI");
                }
            }

            $clean = $this->normalizeAiDrawing($raw, $activeLayerId, $gridSize, $limits);

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

    // Helper to build a tighter prompt on retry
    private function tightPrompt(int $gridSize, string $encodedProjectData, array $limits): string
    {
        return <<<EOD
You must return a valid JSON object only. Keep output short. Respect these HARD LIMITS:
- Max strokes: {$limits['max_strokes']}
- Max shapes: {$limits['max_shapes']}
- Max points per stroke: {$limits['max_points_per_stroke']}
- Max points per polygon: {$limits['max_points_per_polygon']}
- Max total points: {$limits['max_total_points']}

All coordinates must be integers and multiples of gridSize. Round wall endpoints to grid.

Format:
{"strokes":[...],"shapes":[...]}

gridSize: {$gridSize}
Current project data:
{$encodedProjectData}
EOD;
    }

    // --- Helpers ---

    private function normalizeAiDrawing(array $data, int $activeLayerId, int $gridSize, array $limits = []): array
    {
        // Defaults if not provided
        $limits = array_merge([
            'max_strokes' => 100,
            'max_shapes' => 120,
            'max_points_per_stroke' => 200,
            'max_points_per_polygon' => 200,
            'max_total_points' => 4000,
        ], $limits);

        $hex = '/^#([A-Fa-f0-9]{6})$/';
        $snap = function ($n) use ($gridSize) {
            if (!is_numeric($n)) return 0;
            return (int)round(((float)$n) / $gridSize) * $gridSize;
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
        $trimPoints = function(array $pts, int $maxLen) {
            if ($maxLen <= 0) return [];
            if (count($pts) <= $maxLen) return $pts;
            // Keep even length
            $maxLen = $maxLen - ($maxLen % 2);
            return array_slice($pts, 0, max(0, $maxLen));
        };

        $totalPoints = 0;

        $outStrokes = [];
        foreach (($data['strokes'] ?? []) as $s) {
            if (count($outStrokes) >= $limits['max_strokes']) break;
            if (!is_array($s)) continue;
            $pts = $s['points'] ?? null;
            if (!is_array($pts) || count($pts) < 4) continue;
            // Enforce per-stroke and total points limits
            $room = max(0, $limits['max_total_points'] - $totalPoints);
            if ($room < 4) break;
            $maxForThis = min($limits['max_points_per_stroke'], $room);
            $pts = $trimPoints($pts, $maxForThis);
            if (count($pts) < 4) continue;

            $color = is_string($s['color'] ?? null) && preg_match($hex, $s['color']) ? $s['color'] : '#9ca3af';
            $thickness = isset($s['thickness']) ? (int)$s['thickness'] : 2;
            if ($thickness < 1) $thickness = 1;
            if ($thickness > 200) $thickness = 200;

            $snapPts = $snapPoints($pts);
            $outStrokes[] = [
                'id' => $s['id'] ?? (int) (microtime(true) * 1000),
                'points' => $snapPts,
                'color' => $color,
                'thickness' => $thickness,
                'isWall' => (bool)($s['isWall'] ?? false),
                'layer_id' => isset($s['layer_id']) ? (int)$s['layer_id'] : $activeLayerId,
                'material' => isset($s['material']) && is_string($s['material']) ? $s['material'] : null,
                'rotation' => isset($s['rotation']) ? (float)$s['rotation'] : 0,
            ];
            $totalPoints += count($snapPts);
            if ($totalPoints >= $limits['max_total_points']) break;
        }

        $outShapes = [];
        foreach (($data['shapes'] ?? []) as $sh) {
            if (count($outShapes) >= $limits['max_shapes']) break;
            if ($totalPoints >= $limits['max_total_points']) break;
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
                // Enforce limits: per-polygon and total
                $room = max(0, $limits['max_total_points'] - $totalPoints);
                if ($room < 6) continue;
                $maxForThis = min($limits['max_points_per_polygon'], $room);
                $pts = $trimPoints($pts, $maxForThis);
                if (!$evenPoints($pts)) continue;
                $pts = array_map(fn($v) => $snap($v), $pts);

                // Compute bbox and convert to local points
                $minX = PHP_INT_MAX; $minY = PHP_INT_MAX;
                for ($i = 0; $i < count($pts); $i += 2) {
                    $minX = min($minX, $pts[$i]);
                    $minY = min($minY, $pts[$i + 1]);
                }
                $local = [];
                for ($i = 0; $i < count($pts); $i += 2) {
                    $local[] = $pts[$i] - $minX;
                    $local[] = $pts[$i + 1] - $minY;
                }

                $fill = is_string($sh['fill'] ?? null) && preg_match($hex, $sh['fill']) ? $sh['fill'] : '#9ca3af';
                $color = is_string($sh['color'] ?? null) && preg_match($hex, $sh['color']) ? $sh['color'] : $fill;

                $outShapes[] = [
                    'id' => $sh['id'] ?? (int) (microtime(true) * 1000),
                    'type' => 'polygon',
                    'x' => (int)$minX,
                    'y' => (int)$minY,
                    'points' => $local,
                    'fill' => $fill,
                    'color' => $color,
                    'closed' => true,
                    'layer_id' => $layerId,
                    'rotation' => $rotation,
                ];
                $totalPoints += count($local);
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