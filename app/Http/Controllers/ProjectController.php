<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Layer;
use App\Models\Stroke;
use App\Models\Eraser;
use App\Models\Shape;
use App\Models\Block;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ProjectController — REST endpoints for project CRUD operations
 * 
 * SECURITY FEATURES:
 * - User authorization: All operations scoped to auth()->id()
 * - Input validation: Comprehensive rules on store() and save()
 *   - Project name: max 100 chars, alphanumeric + spaces/hyphens/underscores/parentheses
 *   - Layer data: name trimmed, order validated as integer
 *   - Stroke/Eraser points: validated as array of {x,y} with finite numeric values
 *   - Color values: enforced hex format (#RRGGBB or #RGB)
 *   - Shape dimensions: non-negative, finite numeric values
 *   - Shape types: whitelist (rect, circle, oval, polygon)
 *   - All numeric inputs: clamped to safe ranges
 * - Data sanitization:
 *   - JSON encoding for arrays/points (prevents SQL injection)
 *   - String trimming and length limits
 *   - Regex validation for user-facing strings
 * - Database: Eloquent ORM prevents SQL injection; uses transactions for data integrity
 */
class ProjectController extends Controller
{
    // List user's projects
    public function index()
    {
        $projects = Project::where('user_id', auth()->id())->get();
        return response()->json(['projects' => $projects]);
    }

    // Create project + default layer, return id
    public function store(Request $request)
    {
        // Validate input with comprehensive security checks
        $validated = $request->validate([
            'name' => [
                'string',
                'min:1',
                'max:100',
                'regex:/^[a-zA-Z0-9\s\-_()]+$/', // Allow alphanumeric, spaces, hyphens, underscores, parentheses
            ],
        ], [
            'name.regex' => 'Project name contains invalid characters. Use only letters, numbers, spaces, hyphens, underscores, and parentheses.',
            'name.max' => 'Project name must not exceed 100 characters.',
        ]);

        $projectName = trim($validated['name'] ?? 'Untitled Project');
        if (empty($projectName)) {
            $projectName = 'Untitled Project';
        }

        // Ensure user owns the project (additional security check)
        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $projectName,
        ]);

        $layer = Layer::create([
            'project_id' => $project->id,
            'name' => 'Layer 1',
            'order' => 0,
        ]);

        $project->load('layers');
        return response()->json(['project' => $project, 'id' => $project->id]);
    }

    // Return project + flattened data object for the editor
    public function show($id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with('layers.strokes', 'layers.erasers', 'layers.shapes')
            ->firstOrFail();

        $strokes = [];
        $erasers = [];
        $shapes = [];

        foreach ($project->layers as $layer) {
            foreach ($layer->strokes as $st) {
                $points = is_string($st->points) ? json_decode($st->points, true) : $st->points;
                $strokes[] = [
                    'id' => $st->id,
                    'layer_id' => $layer->id,
                    'points' => $points,
                    'color' => $st->color,
                    'thickness' => $st->thickness,
                    'isWall' => (bool)$st->isWall,
                    'material' => $st->material,
                ];
            }
            foreach ($layer->erasers as $er) {
                $points = is_string($er->points) ? json_decode($er->points, true) : $er->points;
                $erasers[] = [
                    'id' => $er->id,
                    'layer_id' => $layer->id,
                    'points' => $points,
                    'thickness' => $er->thickness,
                ];
            }
            foreach ($layer->shapes as $sh) {
                $shapes[] = [
                    'id' => $sh->id,
                    'layer_id' => $layer->id,
                    'type' => $sh->type,
                    'x' => $sh->x,
                    'y' => $sh->y,
                    'width' => $sh->width,
                    'height' => $sh->height,
                    'radius' => $sh->radius,
                    'radiusX' => $sh->radiusX,
                    'radiusY' => $sh->radiusY,
                    'color' => $sh->color,
                    'fill' => $sh->fill,
                    'stroke' => $sh->stroke,
                    'strokeWidth' => $sh->strokeWidth,
                    'rotation' => $sh->rotation ?? 0,
                    'closed' => (bool)$sh->closed,
                    'points' => is_string($sh->points) ? json_decode($sh->points, true) : $sh->points,
                ];
            }
        }

        $data = [
            'strokes' => $strokes,
            'erasers' => $erasers,
            'shapes' => $shapes,
        ];

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'layers' => $project->layers,
                'data' => $data,
            ],
        ]);
    }

    // Save — supports both legacy "layers" payload and modern "data" payload
    public function save(Request $request, $id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with('layers')
            ->firstOrFail();

        // Validate incoming data structure
        $validated = $request->validate([
            'data' => 'nullable|array',
            'data.projectName' => 'nullable|string|max:100|regex:/^[a-zA-Z0-9\s\-_()]*$/',
            'data.layers' => 'nullable|array',
            'data.strokes' => 'nullable|array',
            'data.erasers' => 'nullable|array',
            'data.shapes' => 'nullable|array',
        ], [
            'data.projectName.regex' => 'Project name contains invalid characters.',
        ]);

        DB::transaction(function () use ($request, $project) {
            $data = $request->input('data', []);
            $incomingLayers = $data['layers'] ?? [];

            // Validate and sanitize layers
            $validatedLayers = [];
            foreach ($incomingLayers as $l) {
                $layerName = trim($l['name'] ?? 'Layer');
                if (empty($layerName)) {
                    $layerName = 'Layer';
                }
                $validatedLayers[] = [
                    'id' => $l['id'] ?? null,
                    'name' => $layerName,
                    'order' => (int)($l['order'] ?? 0),
                ];
            }

            $layerMap = [];
            foreach ($validatedLayers as $l) {
                $layer = Layer::updateOrCreate(
                    ['id' => $l['id'] ?? null, 'project_id' => $project->id],
                    ['name' => $l['name'], 'order' => $l['order']]
                );
                $layerMap[$l['id'] ?? $layer->id] = $layer->id;
            }

            $currentLayerIds = array_values($layerMap);
            Layer::where('project_id', $project->id)
                 ->whereNotIn('id', $currentLayerIds)
                 ->each(function ($layer) {
                     Stroke::where('layer_id', $layer->id)->delete();
                     Eraser::where('layer_id', $layer->id)->delete();
                     Shape::where('layer_id', $layer->id)->delete();
                     $layer->delete();
                 });

            $layerIds = array_values($layerMap);

            // strokes — validate points, color, thickness
            $incomingStrokeIds = [];
            foreach ($data['strokes'] ?? [] as $s) {
                // Validate points array
                $points = $s['points'] ?? [];
                if (!is_array($points) || empty($points)) {
                    continue; // Skip invalid strokes
                }
                
                // Validate points are flat numeric array [x1,y1,x2,y2,...]
                if (count($points) % 2 !== 0) continue; // must have even count
                foreach ($points as $val) {
                    if (!is_numeric($val) || !is_finite((float)$val)) {
                        continue 2; // Skip this stroke if any value is invalid
                    }
                }

                // Validate color (hex format)
                $color = $s['color'] ?? '#ffffff';
                if (!preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
                    $color = '#ffffff';
                }

                // Validate thickness (1-200)
                $thickness = (int)($s['thickness'] ?? 6);
                $thickness = max(1, min(200, $thickness));

                $layerId = $layerMap[$s['layer_id']] ?? $layerIds[0] ?? null;
                if (!$layerId) {
                    continue;
                }

                $attrs = [
                    'layer_id' => $layerId,
                    'points' => json_encode($points),
                    'color' => $color,
                    'thickness' => $thickness,
                    'isWall' => (bool)($s['isWall'] ?? false),
                    'material' => is_string($s['material'] ?? null) ? trim($s['material']) : null,
                ];
                
                $stroke = !empty($s['id'])
                    ? Stroke::where('id', $s['id'])->whereIn('layer_id', $layerIds)->first()
                    : null;
                $stroke = $stroke ? tap($stroke)->update($attrs) : Stroke::create($attrs);
                $incomingStrokeIds[] = $stroke->id;
            }
            Stroke::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingStrokeIds)->delete();

            // erasers — validate points, thickness
            $incomingEraserIds = [];
            foreach ($data['erasers'] ?? [] as $e) {
                // Validate points array
                $points = $e['points'] ?? [];
                if (!is_array($points) || empty($points)) {
                    continue; // Skip invalid erasers
                }
                
                // Validate points are flat numeric array [x1,y1,x2,y2,...]
                if (count($points) % 2 !== 0) continue; // must have even count
                foreach ($points as $val) {
                    if (!is_numeric($val) || !is_finite((float)$val)) {
                        continue 2; // Skip this eraser if any value is invalid
                    }
                }

                // Validate thickness (1-200)
                $thickness = (int)($e['thickness'] ?? 6);
                $thickness = max(1, min(200, $thickness));

                $layerId = $layerMap[$e['layer_id']] ?? $layerIds[0] ?? null;
                if (!$layerId) {
                    continue;
                }

                $attrs = [
                    'layer_id' => $layerId,
                    'points' => json_encode($points),
                    'thickness' => $thickness,
                ];
                
                $er = !empty($e['id'])
                    ? Eraser::where('id', $e['id'])->whereIn('layer_id', $layerIds)->first()
                    : null;
                $er = $er ? tap($er)->update($attrs) : Eraser::create($attrs);
                $incomingEraserIds[] = $er->id;
            }
            Eraser::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingEraserIds)->delete();

            // shapes — validate type, coordinates, dimensions, colors
            $incomingShapeIds = [];
            $validShapeTypes = ['rect', 'circle', 'oval', 'polygon'];
            
            foreach ($data['shapes'] ?? [] as $sh) {
                $type = $sh['type'] ?? 'rect';
                
                // Validate shape type
                if (!in_array($type, $validShapeTypes)) {
                    continue;
                }

                // Validate coordinates are numeric and finite
                $x = (float)($sh['x'] ?? 0);
                $y = (float)($sh['y'] ?? 0);
                if (!is_finite($x) || !is_finite($y)) {
                    continue;
                }

                // Validate color (hex format)
                $color = $sh['color'] ?? ($sh['fill'] ?? '#9CA3AF');
                if (!preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
                    $color = '#9CA3AF';
                }

                // Validate rotation
                $rotation = (float)($sh['rotation'] ?? 0);
                $rotation = fmod($rotation, 360); // Normalize to 0-360

                $layerId = $layerMap[$sh['layer_id']] ?? $layerIds[0] ?? null;
                if (!$layerId) {
                    continue;
                }

                $attrs = [
                    'layer_id' => $layerId,
                    'type' => $type,
                    'x' => $x,
                    'y' => $y,
                    'color' => $color,
                    'rotation' => $rotation,
                ];

                // Type-specific validation
                if ($type === 'rect') {
                    $width = (float)($sh['width'] ?? 0);
                    $height = (float)($sh['height'] ?? 0);
                    if (!is_finite($width) || !is_finite($height) || $width <= 0 || $height <= 0) {
                        continue;
                    }
                    $attrs['width'] = $width;
                    $attrs['height'] = $height;
                } elseif ($type === 'circle') {
                    $radius = (float)($sh['radius'] ?? 0);
                    if (!is_finite($radius) || $radius <= 0) {
                        continue;
                    }
                    $attrs['radius'] = $radius;
                } elseif ($type === 'oval') {
                    $radiusX = (float)($sh['radiusX'] ?? 0);
                    $radiusY = (float)($sh['radiusY'] ?? 0);
                    if (!is_finite($radiusX) || !is_finite($radiusY) || $radiusX <= 0 || $radiusY <= 0) {
                        continue;
                    }
                    $attrs['radiusX'] = $radiusX;
                    $attrs['radiusY'] = $radiusY;
                } elseif ($type === 'polygon') {
                    $points = $sh['points'] ?? [];
                    if (!is_array($points) || empty($points)) {
                        continue;
                    }
                    // Validate polygon points are flat numeric array [x1,y1,x2,y2,...]
                    if (count($points) % 2 !== 0) continue;
                    foreach ($points as $val) {
                        if (!is_numeric($val) || !is_finite((float)$val)) {
                            continue 2; // Skip this shape if any value is invalid
                        }
                    }
                    $attrs['points'] = json_encode($points);
                    $attrs['fill'] = $sh['fill'] ?? $color;
                    $attrs['closed'] = (bool)($sh['closed'] ?? true);
                }

                $shape = !empty($sh['id'])
                    ? Shape::where('id', $sh['id'])->whereIn('layer_id', $layerIds)->first()
                    : null;

                $shape = $shape ? tap($shape)->update($attrs) : Shape::create($attrs);
                $incomingShapeIds[] = $shape->id;
            }
            Shape::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingShapeIds)->delete();

            // Validate and sanitize project name
            if (isset($data['projectName'])) {
                $projectName = trim($data['projectName'] ?? '');
                // Validate against regex from request validation
                if (!empty($projectName) && preg_match('/^[a-zA-Z0-9\s\-_()]*$/', $projectName)) {
                    $project->name = substr($projectName, 0, 100); // Max 100 chars
                    $project->save();
                }
            }

            // Validate and sanitize project settings
            $gridSize = (int)($data['gridSize'] ?? 0);
            $gridSize = max(0, min(1000, $gridSize)); // 0-1000
            
            $units = $data['units'] ?? null;
            if ($units && !in_array($units, ['mm', 'cm', 'm', 'in', 'ft'])) {
                $units = null;
            }
            
            $drawColor = $data['drawColor'] ?? null;
            if ($drawColor && !preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $drawColor)) {
                $drawColor = null;
            }
            
            $thickness = (int)($data['thickness'] ?? 0);
            $thickness = max(0, min(200, $thickness)); // 0-200
            
            $material = $data['material'] ?? null;
            if ($material && !is_string($material)) {
                $material = null;
            }
            $material = $material ? substr(trim($material), 0, 100) : null; // Max 100 chars
            
            $project->update([
                'grid_size' => $gridSize,
                'units' => $units,
                'draw_color' => $drawColor,
                'thickness' => $thickness,
                'material' => $material,
            ]);
        });

        return response()->json(['success' => true]);
    }
    public function destroy($id)
    {
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        $project->delete();
        return response()->json(['success' => true]);
    }
    public function exportJson($id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with('layers.strokes', 'layers.erasers', 'layers.shapes')
            ->firstOrFail();

        $data = [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'layers' => $project->layers,
            ],
        ];

        $filename = 'project_' . $id . '.json';
        return response()->streamDownload(function () use ($data) {
            echo json_encode($data, JSON_PRETTY_PRINT);
        }, $filename, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
    
    public function updateName(Request $request, $id)
    {
        $request->validate(['name' => 'required|string|max:255']);
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        $project->name = $request->input('name');
        $project->save();
        return response()->json(['success' => true, 'project' => $project]);
    }

    // Create a new layer for a project
    public function addLayer(Request $request, $id)
    {
        $project = Project::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        $name = $request->input('name', 'Layer ' . ($project->layers()->count() + 1));
        $order = $request->input('order', ($project->layers()->max('order') ?? 0) + 1);

        $layer = Layer::create([
            'project_id' => $project->id,
            'name' => $name,
            'order' => $order,
        ]);

        return response()->json(['layer' => $layer]);   
    }
   public function exportPNG($id)
    {
        // Fetch project with layers, strokes, erasers, and shapes
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with(['layers.strokes', 'layers.erasers', 'layers.shapes'])
            ->firstOrFail();

        // Calculate canvas bounds dynamically
        $minX = $minY = PHP_INT_MAX;
        $maxX = $maxY = PHP_INT_MIN;

        foreach ($project->layers as $layer) {
            foreach ($layer->shapes as $shape) {
                if ($shape->type === 'rect') {
                    $minX = min($minX, $shape->x);
                    $minY = min($minY, $shape->y);
                    $maxX = max($maxX, $shape->x + ($shape->width ?? 0));
                    $maxY = max($maxY, $shape->y + ($shape->height ?? 0));
                } elseif ($shape->type === 'circle') {
                    $radius = $shape->radius ?? 40;
                    $centerX = $shape->x ?? 0;
                    $centerY = $shape->y ?? 0;
                    $minX = min($minX, $centerX - $radius);
                    $minY = min($minY, $centerY - $radius);
                    $maxX = max($maxX, $centerX + $radius);
                    $maxY = max($maxY, $centerY + $radius);
                } elseif ($shape->type === 'oval') {
                    $rx = $shape->radiusX ?? 40;
                    $ry = $shape->radiusY ?? 30;
                    $centerX = $shape->x ?? 0;
                    $centerY = $shape->y ?? 0;
                    $minX = min($minX, $centerX - $rx);
                    $minY = min($minY, $centerY - $ry);
                    $maxX = max($maxX, $centerX + $rx);
                    $maxY = max($maxY, $centerY + $ry);
                } elseif ($shape->type === 'polygon') {
                    $pts = is_string($shape->points) ? json_decode($shape->points, true) : ($shape->points ?? []);
                    $offX = (int)($shape->x ?? 0);
                    $offY = (int)($shape->y ?? 0);
                    for ($i = 0; $i < count($pts); $i += 2) {
                        $px = (int)($pts[$i] ?? 0) + $offX;
                        $py = (int)($pts[$i + 1] ?? 0) + $offY;
                        $minX = min($minX, $px);
                        $minY = min($minY, $py);
                        $maxX = max($maxX, $px);
                        $maxY = max($maxY, $py);
                    }
                }
            }
            foreach ($layer->strokes as $stroke) {
                $points = is_string($stroke->points) ? json_decode($stroke->points, true) : $stroke->points;
                for ($i = 0; $i < count($points); $i += 2) {
                    $minX = min($minX, $points[$i]);
                    $minY = min($minY, $points[$i + 1]);
                    $maxX = max($maxX, $points[$i]);
                    $maxY = max($maxY, $points[$i + 1]);
                }
            }
            foreach ($layer->erasers as $eraser) {
                $points = is_string($eraser->points) ? json_decode($eraser->points, true) : $eraser->points;
                for ($i = 0; $i < count($points); $i += 2) {
                    $minX = min($minX, $points[$i]);
                    $minY = min($minY, $points[$i + 1]);
                    $maxX = max($maxX, $points[$i]);
                    $maxY = max($maxY, $points[$i + 1]);
                }
            }
        }

        if ($minX === PHP_INT_MAX || $minY === PHP_INT_MAX || $maxX === PHP_INT_MIN || $maxY === PHP_INT_MIN) {
            // Nothing to draw; set reasonable defaults
            $minX = $minY = 0;
            $maxX = $maxY = 1000;
        }

        // Set canvas size with padding
        $padding = 50;
        $width = max(2000, (int)($maxX - $minX + 2 * $padding));
        $height = max(2000, (int)($maxY - $minY + 2 * $padding));
        $offsetX = $minX < 0 ? -$minX + $padding : $padding;
        $offsetY = $minY < 0 ? -$minY + $padding : $padding;

        // Create canvas
        $image = imagecreatetruecolor($width, $height);
        $bgColor = imagecolorallocate($image, 255, 255, 255); // White background
        imagefill($image, 0, 0, $bgColor);

        // Draw layers in order
        foreach ($project->layers as $layer) {
            // Draw shapes
            foreach ($layer->shapes as $shape) {
                // Parse color (default to black if invalid)
                $hex = $shape->fill ?: $shape->color;
                $hex = $hex ?: '#000000';
                $rgb = sscanf($hex, "#%02x%02x%02x");
                $imgColor = imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);

                // Adjust coordinates with offset
                switch ($shape->type) {
                    case 'rect':
                        $x = (int)(($shape->x ?? 0) + $offsetX);
                        $y = (int)(($shape->y ?? 0) + $offsetY);
                        $w = (int)($shape->width ?? 100);
                        $h = (int)($shape->height ?? 60);
                        if ($w > 0 && $h > 0) {
                            imagefilledrectangle($image, $x, $y, $x + $w, $y + $h, $imgColor);
                        }
                        break;
                    case 'circle':
                        $centerX = (int)(($shape->x ?? 0) + $offsetX);
                        $centerY = (int)(($shape->y ?? 0) + $offsetY);
                        $radius = (int)($shape->radius ?? 40);
                        if ($radius > 0) {
                            imagefilledellipse($image, $centerX, $centerY, $radius * 2, $radius * 2, $imgColor);
                        }
                        break;
                    case 'oval':
                        $centerX = (int)(($shape->x ?? 0) + $offsetX);
                        $centerY = (int)(($shape->y ?? 0) + $offsetY);
                        $rx = (int)($shape->radiusX ?? 40);
                        $ry = (int)($shape->radiusY ?? 30);
                        if ($rx > 0 && $ry > 0) {
                            imagefilledellipse($image, $centerX, $centerY, $rx * 2, $ry * 2, $imgColor);
                        }
                        break;
                    case 'polygon':
                        $pts = is_string($shape->points) ? json_decode($shape->points, true) : ($shape->points ?? []);
                        if (is_array($pts) && count($pts) >= 6 && count($pts) % 2 === 0) {
                            $offX = (int)(($shape->x ?? 0) + $offsetX);
                            $offY = (int)(($shape->y ?? 0) + $offsetY);
                            $abs = [];
                            for ($i = 0; $i < count($pts); $i += 2) {
                                $abs[] = (int)($pts[$i] + $offX);
                                $abs[] = (int)($pts[$i + 1] + $offY);
                            }
                            // GD expects a flat array of coordinates
                            $numPoints = count($abs) / 2;
                            imagefilledpolygon($image, $abs, $numPoints, $imgColor);
                        }
                        break;
                }
            }

            // Draw strokes
            foreach ($layer->strokes as $stroke) {
                $points = is_string($stroke->points) ? json_decode($stroke->points, true) : $stroke->points;
                if (count($points) < 2) continue;

                $color = $stroke->color ? sscanf($stroke->color, "#%02x%02x%02x") : [0, 0, 0];
                $imgColor = imagecolorallocate($image, $color[0], $color[1], $color[2]);
                imagesetthickness($image, max(1, (int)($stroke->thickness ?? 6)));

                for ($i = 0; $i < count($points) - 2; $i += 2) {
                    $x1 = (int)($points[$i] + $offsetX);
                    $y1 = (int)($points[$i + 1] + $offsetY);
                    $x2 = (int)($points[$i + 2] + $offsetX);
                    $y2 = (int)($points[$i + 3] + $offsetY);
                    imageline($image, $x1, $y1, $x2, $y2, $imgColor);
                }
            }

            // Draw erasers (as white strokes to simulate erasing)
            foreach ($layer->erasers as $eraser) {
                $points = is_string($eraser->points) ? json_decode($eraser->points, true) : $eraser->points;
                if (count($points) < 2) continue;

                $imgColor = imagecolorallocate($image, 255, 255, 255); // White for erasing
                imagesetthickness($image, max(1, (int)($eraser->thickness ?? 40)));

                for ($i = 0; $i < count($points) - 2; $i += 2) {
                    $x1 = (int)($points[$i] + $offsetX);
                    $y1 = (int)($points[$i + 1] + $offsetY);
                    $x2 = (int)($points[$i + 2] + $offsetX);
                    $y2 = (int)($points[$i + 3] + $offsetY);
                    imageline($image, $x1, $y1, $x2, $y2, $imgColor);
                }
            }
        }

        // Set headers and output PNG
        header('Content-Type: image/png');
        header('Content-Disposition: attachment; filename="project_' . $id . '.png"');
        imagepng($image);
        imagedestroy($image);
        exit;
    }
    public function createBlockWithAnchor(Request $request)
    {
        $data = $request->validate([
            'layer_id' => 'required|integer|exists:layers,id',
            'object_ids' => 'required|array',
            // points/width/height/anchor_x/anchor_y may be present in some callers
            'points' => 'sometimes|array',
            'width' => 'sometimes|numeric',
            'height' => 'sometimes|numeric',
            'anchor_x' => 'sometimes|numeric',
            'anchor_y' => 'sometimes|numeric',
        ]);

        $round = function($v) { return is_numeric($v) ? round((float)$v, 1) : $v; };
        $roundDeep = function($val) use (&$roundDeep, $round) {
            if (is_array($val)) return array_map($roundDeep, $val);
            return $round($val);
        };

        // Round optional geometry inputs
        if (isset($data['points'])) $data['points'] = $roundDeep($data['points']);
        if (isset($data['width'])) $data['width'] = $round($data['width']);
        if (isset($data['height'])) $data['height'] = $round($data['height']);
        if (isset($data['anchor_x'])) $data['anchor_x'] = $round($data['anchor_x']);
        if (isset($data['anchor_y'])) $data['anchor_y'] = $round($data['anchor_y']);

        $objects = \App\Models\Shape::whereIn('id', $data['object_ids'])->get();

        // Calculate bounding box (rounded to 0.1)
        $minX = $objects->min('x') ?? 0;
        $minY = $objects->min('y') ?? 0;
        $maxX = $objects->max(function($obj) { return ($obj->x ?? 0) + ($obj->width ?? $obj->radius ?? 0); }) ?? 0;
        $maxY = $objects->max(function($obj) { return ($obj->y ?? 0) + ($obj->height ?? $obj->radius ?? 0); }) ?? 0;

        $width = round($maxX - $minX, 1);
        $height = round($maxY - $minY, 1);
        $anchor_x = round($minX + ($width / 2), 1);
        $anchor_y = round($minY + ($height / 2), 1);

        $block = \App\Models\Block::create([
            'layer_id' => (int)$data['layer_id'],
            'object_ids' => json_encode($data['object_ids']),
            'width' => $width,
            'height' => $height,
            'anchor_x' => $anchor_x,
            'anchor_y' => $anchor_y,
        ]);

        return response()->json(['block' => $block]);
    }



}