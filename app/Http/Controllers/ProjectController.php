<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Layer;
use App\Models\Stroke;
use App\Models\Eraser;
use App\Models\Shape;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $request->input('name', 'Untitled Project'),
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
                    'color' => $sh->color,
                    'rotation' => $sh->rotation ?? 0,
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

        DB::transaction(function () use ($request, $project) {
            $data = $request->input('data', []);
            $incomingLayers = $data['layers'] ?? [];

            // Sync layers
            $layerMap = [];
            foreach ($incomingLayers as $l) {
                $layer = Layer::updateOrCreate(
                    ['id' => $l['id'] ?? null, 'project_id' => $project->id],
                    ['name' => $l['name'] ?? 'Layer', 'order' => $l['order'] ?? 0]
                );
                $layerMap[$l['id'] ?? $layer->id] = $layer->id;
            }

            // Delete removed layers
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

            // strokes
            $incomingStrokeIds = [];
            foreach ($data['strokes'] ?? [] as $s) {
                $layerId = $layerMap[$s['layer_id']] ?? $layerIds[0];
                $attrs = [
                    'layer_id' => $layerId,
                    'points' => is_array($s['points']) ? json_encode($s['points']) : $s['points'],
                    'color' => $s['color'] ?? '#fff',
                    'thickness' => $s['thickness'] ?? 6,
                    'isWall' => $s['isWall'] ?? false,
                    'material' => $s['material'] ?? null,
                ];
                if (!empty($s['id'])) {
                    $stroke = Stroke::updateOrCreate(['id' => $s['id']], $attrs);
                } else {
                    $stroke = Stroke::create($attrs);
                }
                $incomingStrokeIds[] = $stroke->id;
            }
            // remove strokes that are gone
            Stroke::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingStrokeIds)->delete();

            // erasers
            $incomingEraserIds = [];
            foreach ($data['erasers'] ?? [] as $e) {
                $layerId = $layerMap[$e['layer_id']] ?? $layerIds[0];
                $attrs = [
                    'layer_id' => $layerId,
                    'points' => is_array($e['points']) ? json_encode($e['points']) : $e['points'],
                    'thickness' => $e['thickness'] ?? 6,
                ];
                if (!empty($e['id'])) {
                    $er = Eraser::updateOrCreate(['id' => $e['id']], $attrs);
                } else {
                    $er = Eraser::create($attrs);
                }
                $incomingEraserIds[] = $er->id;
            }
            Eraser::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingEraserIds)->delete();

            // shapes
            $incomingShapeIds = [];
            foreach ($data['shapes'] ?? [] as $sh) {
                $layerId = $layerMap[$sh['layer_id']] ?? $layerIds[0];
                $attrs = [
                    'layer_id' => $layerId,
                    'type' => $sh['type'] ?? 'rect',
                    'x' => $sh['x'] ?? 0,
                    'y' => $sh['y'] ?? 0,
                    'width' => $sh['width'] ?? null,
                    'height' => $sh['height'] ?? null,
                    'radius' => $sh['radius'] ?? null,
                    'color' => $sh['color'] ?? '#9CA3AF',
                    'rotation' => $sh['rotation'] ?? 0,
                ];
                if (!empty($sh['id'])) {
                    $shape = Shape::updateOrCreate(['id' => $sh['id']], $attrs);
                } else {
                    $shape = Shape::create($attrs);
                }
                $incomingShapeIds[] = $shape->id;
            }
            Shape::whereIn('layer_id', $layerIds)->whereNotIn('id', $incomingShapeIds)->delete();

            // Update project name
            if (isset($data['projectName'])) {
                $project->name = $data['projectName'];
                $project->save();
            }

            // Update project settings
            $project->update([
                'grid_size' => $data['gridSize'] ?? null,
                'units' => $data['units'] ?? null,
                'draw_color' => $data['drawColor'] ?? null,
                'thickness' => $data['thickness'] ?? null,
                'material' => $data['material'] ?? null,
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
                $color = $shape->color ? sscanf($shape->color, "#%02x%02x%02x") : [0, 0, 0];
                $imgColor = imagecolorallocate($image, $color[0], $color[1], $color[2]);

                // Adjust coordinates with offset
                switch ($shape->type) {
                    case 'rect':
                        $x = ($shape->x ?? 0) + $offsetX;
                        $y = ($shape->y ?? 0) + $offsetY;
                        $width = $shape->width ?? 100;
                        $height = $shape->height ?? 60;
                        if ($width > 0 && $height > 0) {
                            imagefilledrectangle($image, $x, $y, $x + $width, $y + $height, $imgColor);
                        }
                        break;
                    case 'circle':
                        $centerX = ($shape->x ?? 0) + $offsetX;
                        $centerY = ($shape->y ?? 0) + $offsetY;
                        $radius = $shape->radius ?? 40;
                        if ($radius > 0) {
                            imagefilledellipse($image, $centerX, $centerY, $radius * 2, $radius * 2, $imgColor);
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
                    $x1 = $points[$i] + $offsetX;
                    $y1 = $points[$i + 1] + $offsetY;
                    $x2 = $points[$i + 2] + $offsetX;
                    $y2 = $points[$i + 3] + $offsetY;
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
                    $x1 = $points[$i] + $offsetX;
                    $y1 = $points[$i + 1] + $offsetY;
                    $x2 = $points[$i + 2] + $offsetX;
                    $y2 = $points[$i + 3] + $offsetY;
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
}