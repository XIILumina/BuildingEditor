<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
                'model' => 'gpt-4o',
                'messages' => $messages,
            ]);
            Log::debug("OpenAI response: " . json_encode($response));

            return response()->json([
                'reply' => $response->choices[0]->message->content,
            ]);
        } catch (\Throwable $e) {
            Log::error("OpenAI error: " . $e->getMessage());
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
        Log::debug("AI Draw Suggestion Request: " . json_encode($request->all()));

        if (!env('OPENAI_API_KEY')) {
            Log::error("OPENAI_API_KEY is not set in .env");
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
            'max_strokes' => (int) env('AI_MAX_STROKES', 100),
            'max_shapes' => (int) env('AI_MAX_SHAPES', 120),
            'max_points_per_stroke' => (int) env('AI_MAX_POINTS_PER_STROKE', 300),
            'max_points_per_polygon' => (int) env('AI_MAX_POINTS_PER_POLYGON', 300),
            'max_total_points' => (int) env('AI_MAX_TOTAL_POINTS', 6000),
        ];

        $contextPayload = $this->buildPromptContext($projectData, $activeLayerId, $limits);
        $encodedProjectData = json_encode($contextPayload);

        // Contract-first prompt with explicit instructions for comprehensive designs
        $systemPrompt = <<<EOD
You are a detailed architectural floorplan generator. Your job is to create comprehensive, realistic floor plans.
Return ONLY a valid JSON object: {"strokes":[],"shapes":[]}

CRITICAL DESIGN PRINCIPLES:
1. COMPREHENSIVE: Include walls, doors, windows, fixtures, room divisions, and furniture where appropriate.
2. COHERENT: Use orthogonal lines (horizontal/vertical) for walls unless curves explicitly requested.
3. LOGICAL: Rooms should connect logically. Doors provide access. Windows placed on external walls.
4. DETAILED: Add multiple elements per room: fixtures, furniture outlines, spatial divisions.
5. REALISTIC: For houses/homes, include: bedrooms with doors, bathrooms with fixtures (toilet, tub), kitchens with appliances, living areas with furniture layout.

COORDINATE SYSTEM:
- All coordinates must be integers snapped to gridSize ({$gridSize}).
- Walls are typically 2-4 points (straight lines). Thick stroke with isWall=true.
- Doors are small 1-grid openings in walls, shown as small lines or gaps.
- Windows are small rectangular shapes on walls.
- Rooms can be subdivided with interior walls or divisions.

STYLE GUIDANCE:
- Use dark colors (#1a1a1a, #333333) for structural walls.
- Use #6b7280 for interior divisions/furniture.
- Use white (#ffffff) or light colors for interior fills.
- Thick walls: thickness 3-5. Interior lines: thickness 1-2.

HARD LIMITS (RESPECT THESE):
- Max strokes: {$limits['max_strokes']}
- Max shapes: {$limits['max_shapes']}
- Max points per stroke: {$limits['max_points_per_stroke']}
- Max points per polygon: {$limits['max_points_per_polygon']}
- Max total points: {$limits['max_total_points']}

ALLOWED OBJECTS:

Stroke (wall, division, door, furniture outline):
{"id":number,"points":[x1,y1,x2,y2,...],"color":"#RRGGBB","thickness":number,"isWall":boolean,"layer_id":number,"material":null,"rotation":0}

Rect (window, fixture, furniture block):
{"id":number,"type":"rect","x":number,"y":number,"width":number,"height":number,"color":"#RRGGBB","rotation":0,"layer_id":number}

Circle (fixture, fixture point):
{"id":number,"type":"circle","x":number,"y":number,"radius":number,"color":"#RRGGBB","rotation":0,"layer_id":number}

Oval (fixture, bathroom element):
{"id":number,"type":"oval","x":number,"y":number,"radiusX":number,"radiusY":number,"color":"#RRGGBB","rotation":0,"layer_id":number}

Polygon (room fill, furniture area):
{"id":number,"type":"polygon","x":number,"y":number,"points":[x0,y0,x1,y1,...],"fill":"#RRGGBB","color":"#RRGGBB","closed":true,"layer_id":number,"rotation":0}
NOTE: Polygon points are LOCAL offsets relative to (x,y). Min 6 values (3 points).

EXAMPLES (conceptual):
- Simple House: Outer walls forming rectangle → 4 walls forming perimeter. Interior walls divide into rooms. Doors as small gaps. Windows on exterior walls.
- Bathroom: Room walls + toilet (small rect) + tub/shower (larger rect or oval).
- Kitchen: Walls + counter lines + appliance outlines (rects for fridge/stove).
- Furniture: Sofas, tables, beds as rects with appropriate sizes and colors.

REFINEMENT REQUESTS (if user asks "add details", "add more", "improve"):
- Add missing doors/openings.
- Add fixtures to empty rooms (furniture, appliances, etc.).
- Add interior walls to subdivide large rooms.
- Add windows to external walls.
- Fill in aesthetic details and dimensions.

gridSize: {$gridSize}
activeLayerId: {$activeLayerId}
Current project data:
{$encodedProjectData}

Return only JSON. No markdown, prose, or comments.
EOD;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $prompt],
        ];

        $model = $request->input('model') ?: 'gpt-4o';
        $maxTokens = 4096;
        $temperature = (float) env('AI_TEMPERATURE', 0.18);
        $topP = 0.9;

        try {
            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $messages,
                'temperature' => $temperature,
                'top_p' => $topP,
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => $maxTokens,
            ]);

            if (!isset($response->choices[0]->message->content)) {
                Log::error("Invalid OpenAI response structure: " . json_encode($response));
                throw new \Exception("Invalid response from OpenAI API");
            }

            $content = $response->choices[0]->message->content;
            Log::debug("OpenAI response content: " . $content);

            $jsonString = $content;
            if (strpos($content, '```json') !== false && strrpos($content, '```') !== false) {
                $start = strpos($content, '```json') + 7;
                $end = strrpos($content, '```');
                $jsonString = substr($content, $start, $end - $start);
            }

            $raw = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($raw)) {
                // Retry once with stricter caps to avoid truncation
                Log::warning("AI JSON invalid, retrying with tighter limits.");
                $tightLimits = $limits;
                $tightLimits['max_strokes'] = min($limits['max_strokes'], 20);
                $tightLimits['max_shapes'] = min($limits['max_shapes'], 30);
                $retrySystem = $this->tightPrompt($gridSize, $encodedProjectData, $tightLimits);
                $retryMessages = [
                    ['role' => 'system', 'content' => $retrySystem],
                    ['role' => 'user', 'content' => 'Your previous output was invalid or cut off. Return a smaller valid JSON object within the limits. User request: ' . $prompt],
                ];
                $retryResp = $client->chat()->create([
                    'model' => $model,
                    'messages' => $retryMessages,
                    'temperature' => $temperature,
                    'top_p' => $topP,
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens' => $maxTokens,
                ]);
                $retryContent = $retryResp->choices[0]->message->content ?? '';
                Log::debug("OpenAI retry content: " . $retryContent);
                $raw = json_decode($retryContent, true);
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($raw)) {
                    Log::error("Invalid JSON from AI (retry).");
                    throw new \Exception("Invalid JSON generated by AI");
                }
            }

            $clean = $this->normalizeAiDrawing($raw, $activeLayerId, $gridSize, $limits);

            return response()->json([
                'success' => true,
                'data' => $clean,
            ]);
        } catch (\Throwable $e) {
            Log::error("OpenAI draw suggestion error: " . $e->getMessage());
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
You must return a valid JSON object only. Keep output focused and coherent.

HARD LIMITS (strictly respect):
- Max strokes: {$limits['max_strokes']}
- Max shapes: {$limits['max_shapes']}
- Max points per stroke: {$limits['max_points_per_stroke']}
- Max points per polygon: {$limits['max_points_per_polygon']}
- Max total points: {$limits['max_total_points']}

All coordinates must be integers snapped to gridSize.
For strokes: keep walls straight (2 points), round endpoints to grid.
For polygons: use LOCAL points relative to (x,y).
Prioritize walls, doors, and room divisions over extra decorative elements.

Format: {"strokes":[...],"shapes":[...]}

gridSize: {$gridSize}
Project data:
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
            $maxLen = $maxLen - ($maxLen % 2);
            return array_slice($pts, 0, max(0, $maxLen));
        };
        $dedupeConsecutivePairs = function(array $pts): array {
            $out = [];
            $lastX = null;
            $lastY = null;
            for ($i = 0; $i + 1 < count($pts); $i += 2) {
                $x = $pts[$i];
                $y = $pts[$i + 1];
                if ($lastX !== null && $x === $lastX && $y === $lastY) continue;
                $out[] = $x;
                $out[] = $y;
                $lastX = $x;
                $lastY = $y;
            }
            return $out;
        };
        $isWallLikeStroke = function(array $stroke): bool {
            $isWall = (bool)($stroke['isWall'] ?? false);
            $pts = $stroke['points'] ?? [];
            return $isWall || (is_array($pts) && count($pts) === 4);
        };
        $toNumericPairs = function($pts): array {
            if (!is_array($pts)) return [];
            $out = [];
            for ($i = 0; $i + 1 < count($pts); $i += 2) {
                if (!is_numeric($pts[$i]) || !is_numeric($pts[$i + 1])) continue;
                $out[] = (float)$pts[$i];
                $out[] = (float)$pts[$i + 1];
            }
            return $out;
        };

        $totalPoints = 0;

        $outStrokes = [];
        foreach (($data['strokes'] ?? []) as $s) {
            if (count($outStrokes) >= $limits['max_strokes']) break;
            if (!is_array($s)) continue;
            $pts = $toNumericPairs($s['points'] ?? null);
            if (count($pts) < 4) continue;

            $color = is_string($s['color'] ?? null) && preg_match($hex, $s['color']) ? $s['color'] : '#9ca3af';
            $thickness = isset($s['thickness']) ? (int)$s['thickness'] : 2;
            if ($thickness < 1) $thickness = 1;
            if ($thickness > 200) $thickness = 200;

            $isWall = $isWallLikeStroke($s);

            if ($isWall) {
                // Force walls to be straight: keep only start and end (snapped)
                $x1 = $snap($pts[0] ?? 0);
                $y1 = $snap($pts[1] ?? 0);
                $x2 = $snap($pts[count($pts) - 2] ?? $x1);
                $y2 = $snap($pts[count($pts) - 1] ?? $y1);

                // If start == end, pick farthest point as end
                if ($x1 === $x2 && $y1 === $y2 && count($pts) >= 4) {
                    $bestD = -1;
                    for ($i = 2; $i < count($pts); $i += 2) {
                        $sx = $snap($pts[$i] ?? 0);
                        $sy = $snap($pts[$i + 1] ?? 0);
                        $d = ($sx - $x1) * ($sx - $x1) + ($sy - $y1) * ($sy - $y1);
                        if ($d > $bestD) { $bestD = $d; $x2 = $sx; $y2 = $sy; }
                    }
                }

                // Prefer orthogonal walls: project to axis if one delta dominates
                $dx = abs($x2 - $x1);
                $dy = abs($y2 - $y1);
                if ($dx >= $dy) {
                    // horizontal
                    $y2 = $y1;
                } else {
                    // vertical
                    $x2 = $x1;
                }

                $snapPts = [$x1, $y1, $x2, $y2];
                if ($snapPts[0] === $snapPts[2] && $snapPts[1] === $snapPts[3]) continue;
                $room = max(0, $limits['max_total_points'] - $totalPoints);
                if ($room < 4) break;

                $outStrokes[] = [
                    'id' => $s['id'] ?? (int) (microtime(true) * 1000),
                    'points' => $snapPts,
                    'color' => $color,
                    'thickness' => $thickness,
                    'isWall' => true,
                    'layer_id' => isset($s['layer_id']) ? (int)$s['layer_id'] : $activeLayerId,
                    'material' => isset($s['material']) && is_string($s['material']) ? $s['material'] : null,
                    'rotation' => isset($s['rotation']) ? (float)$s['rotation'] : 0,
                ];
                $totalPoints += 4;
                if ($totalPoints >= $limits['max_total_points']) break;
            } else {
                // Non-wall strokes: enforce per-stroke/total points limits and snap
                $room = max(0, $limits['max_total_points'] - $totalPoints);
                if ($room < 4) break;
                $maxForThis = min($limits['max_points_per_stroke'], $room);
                $pts = $trimPoints($pts, $maxForThis);
                if (count($pts) < 4) continue;

                $snapPts = $snapPoints($pts);
                $snapPts = $dedupeConsecutivePairs($snapPts);
                if (count($snapPts) < 4) continue;
                $outStrokes[] = [
                    'id' => $s['id'] ?? (int) (microtime(true) * 1000),
                    'points' => $snapPts,
                    'color' => $color,
                    'thickness' => $thickness,
                    'isWall' => false,
                    'layer_id' => isset($s['layer_id']) ? (int)$s['layer_id'] : $activeLayerId,
                    'material' => isset($s['material']) && is_string($s['material']) ? $s['material'] : null,
                    'rotation' => isset($s['rotation']) ? (float)$s['rotation'] : 0,
                ];
                $totalPoints += count($snapPts);
                if ($totalPoints >= $limits['max_total_points']) break;
            }
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
                $pts = $toNumericPairs($sh['points'] ?? null);
                if (count($pts) < 6) continue;
                // Enforce limits: per-polygon and total
                $room = max(0, $limits['max_total_points'] - $totalPoints);
                if ($room < 6) continue;
                $maxForThis = min($limits['max_points_per_polygon'], $room);
                $pts = $trimPoints($pts, $maxForThis);
                if (!$evenPoints($pts)) continue;

                // Accept both local and absolute polygon points, then normalize to local.
                $xBase = $snap($sh['x'] ?? 0);
                $yBase = $snap($sh['y'] ?? 0);
                $worldFromLocal = [];
                for ($i = 0; $i < count($pts); $i += 2) {
                    $worldFromLocal[] = $snap(($pts[$i] ?? 0) + $xBase);
                    $worldFromLocal[] = $snap(($pts[$i + 1] ?? 0) + $yBase);
                }
                $worldAbsolute = array_map(fn($v) => $snap($v), $pts);

                $minA_X = PHP_INT_MAX; $minA_Y = PHP_INT_MAX;
                for ($i = 0; $i < count($worldAbsolute); $i += 2) {
                    $minA_X = min($minA_X, $worldAbsolute[$i]);
                    $minA_Y = min($minA_Y, $worldAbsolute[$i + 1]);
                }
                $scoreA = abs($minA_X - $xBase) + abs($minA_Y - $yBase);
                $scoreB = 0; // local interpretation is preferred when x/y provided

                $pts = ($xBase !== 0 || $yBase !== 0)
                    ? ($scoreA <= $gridSize ? $worldAbsolute : $worldFromLocal)
                    : $worldAbsolute;

                $pts = $dedupeConsecutivePairs($pts);
                if (count($pts) < 6) continue;

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
                $local = $dedupeConsecutivePairs($local);
                if (count($local) < 6) continue;

                // Remove trailing duplicate closure if present (Path closes with Z in frontend)
                if (count($local) >= 8) {
                    $lx = $local[0];
                    $ly = $local[1];
                    $ex = $local[count($local) - 2];
                    $ey = $local[count($local) - 1];
                    if ($lx === $ex && $ly === $ey) {
                        $local = array_slice($local, 0, count($local) - 2);
                    }
                }
                if (count($local) < 6) continue;

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

    private function buildPromptContext(array $projectData, int $activeLayerId, array $limits): array
    {
        $strokes = is_array($projectData['strokes'] ?? null) ? $projectData['strokes'] : [];
        $shapes = is_array($projectData['shapes'] ?? null) ? $projectData['shapes'] : [];
        $gridSize = (int)($projectData['gridSize'] ?? 10);

        $inLayerStrokes = array_values(array_filter($strokes, function ($s) use ($activeLayerId) {
            return (int)($s['layer_id'] ?? 0) === $activeLayerId;
        }));
        $inLayerShapes = array_values(array_filter($shapes, function ($s) use ($activeLayerId) {
            return (int)($s['layer_id'] ?? 0) === $activeLayerId;
        }));

        $trimStroke = function ($s) {
            $pts = is_array($s['points'] ?? null) ? $s['points'] : [];
            // Keep up to 40 points to preserve structure (instead of aggressive 12+12 trim)
            if (count($pts) > 40) {
                // Keep first 20 and last 20 to show both start and end of complex strokes
                $head = array_slice($pts, 0, 20);
                $tail = array_slice($pts, -20);
                $pts = array_merge($head, $tail);
            }
            return [
                'id' => $s['id'] ?? null,
                'layer_id' => $s['layer_id'] ?? null,
                'points' => $pts,
                'thickness' => $s['thickness'] ?? null,
                'color' => $s['color'] ?? null,
            ];
        };

        $trimShape = function ($sh) {
            $base = [
                'id' => $sh['id'] ?? null,
                'layer_id' => $sh['layer_id'] ?? null,
                'type' => $sh['type'] ?? null,
                'x' => $sh['x'] ?? null,
                'y' => $sh['y'] ?? null,
                'rotation' => $sh['rotation'] ?? null,
                'color' => $sh['color'] ?? ($sh['fill'] ?? null),
            ];
            if (($sh['type'] ?? null) === 'rect') {
                $base['width'] = $sh['width'] ?? null;
                $base['height'] = $sh['height'] ?? null;
            } elseif (($sh['type'] ?? null) === 'circle') {
                $base['radius'] = $sh['radius'] ?? null;
            } elseif (($sh['type'] ?? null) === 'oval') {
                $base['radiusX'] = $sh['radiusX'] ?? null;
                $base['radiusY'] = $sh['radiusY'] ?? null;
            } elseif (($sh['type'] ?? null) === 'polygon') {
                $pts = is_array($sh['points'] ?? null) ? $sh['points'] : [];
                // Keep up to 40 points instead of aggressive 12+12 trim
                if (count($pts) > 40) {
                    $head = array_slice($pts, 0, 20);
                    $tail = array_slice($pts, -20);
                    $pts = array_merge($head, $tail);
                }
                $base['points'] = $pts;
            }
            return $base;
        };

        return [
            'gridSize' => $gridSize,
            'activeLayerId' => $activeLayerId,
            'limits' => $limits,
            'layers' => $projectData['layers'] ?? [],
            'activeLayerSnapshot' => [
                'strokeCount' => count($inLayerStrokes),
                'shapeCount' => count($inLayerShapes),
                'strokes' => array_map($trimStroke, array_slice($inLayerStrokes, -80)),
                'shapes' => array_map($trimShape, array_slice($inLayerShapes, -80)),
            ],
        ];
    }
}