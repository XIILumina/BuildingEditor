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
    // List current user's projects
    public function index(Request $request)
    {
        $projects = Project::where('user_id', $request->user()->id)
            ->select('id','name','created_at','updated_at')
            ->orderBy('updated_at','desc')
            ->get();

        // Return in a { projects: [...] } wrapper (Dashboard expects this)
        return response()->json(['projects' => $projects]);
    }

    // Create project with basic limits
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required','string','max:100','regex:/^[\pL\pN\s\-_]+$/u'],
            'description' => ['nullable','string','max:1000','regex:/^[\pL\pN\s\.,:;!?\-_\(\)]+$/u'],
        ]);

        $project = Project::create([
            'user_id' => $request->user()->id,
            'name' => trim($data['name']),
            'description' => isset($data['description']) ? trim($data['description']) : null,
        ]);

        // Return in a { project: {...} } wrapper (Editor loader expects this)
        return response()->json(['project' => $project], 201);
    }

    // Get one project with layers and aggregated editor data
    public function show(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        // Layers
        $layers = Layer::where('project_id', $project->id)
            ->select('id','name','order')
            ->orderBy('order')
            ->get()
            ->values();

        // Collect editor data across layers
        $strokes = [];
        $erasers = [];
        $shapes  = [];

        foreach ($layers as $layer) {
            // strokes
            $layerStrokes = Stroke::where('layer_id', $layer->id)->get();
            foreach ($layerStrokes as $st) {
                $strokes[] = [
                    'id' => $st->id,
                    'layer_id' => $layer->id,
                    'points' => is_string($st->points) ? json_decode($st->points, true) : $st->points,
                    'color' => $st->color,
                    'thickness' => (int)$st->thickness,
                    'isWall' => (bool)$st->isWall,
                    'material' => $st->material,
                    'rotation' => (float)($st->rotation ?? 0),
                ];
            }
            // erasers
            $layerErasers = Eraser::where('layer_id', $layer->id)->get();
            foreach ($layerErasers as $er) {
                $erasers[] = [
                    'id' => $er->id,
                    'layer_id' => $layer->id,
                    'points' => is_string($er->points) ? json_decode($er->points, true) : $er->points,
                    'thickness' => (int)$er->thickness,
                ];
            }
            // shapes
            $layerShapes = Shape::where('layer_id', $layer->id)->get();
            foreach ($layerShapes as $sh) {
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
                    'points' => is_string($sh->points) ? json_decode($sh->points, true) : $sh->points,
                    'fill' => $sh->fill,
                    'stroke' => $sh->stroke,
                    'strokeWidth' => $sh->strokeWidth,
                    'rotation' => (float)($sh->rotation ?? 0),
                    'closed' => (bool)$sh->closed,
                    'color' => $sh->color,
                ];
            }
        }

        // Optional project-level prefs (if you have these columns; else drop them)
        $data = [
            'strokes' => $strokes,
            'erasers' => $erasers,
            'shapes' => $shapes,
        ];

        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'layers' => $layers,
                'data' => $data,
            ]
        ]);
    }

    // Update name/description
    public function update(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'name' => ['sometimes','string','max:100','regex:/^[\pL\pN\s\-_]+$/u'],
            'description' => ['nullable','string','max:1000','regex:/^[\pL\pN\s\.,:;!?\-_\(\)]+$/u'],
        ]);

        $project->update(array_filter([
            'name' => isset($data['name']) ? trim($data['name']) : null,
            'description' => isset($data['description']) ? trim($data['description']) : null,
        ], fn($v) => !is_null($v)));

        return response()->json(['project' => $project]);
    }

    // Delete
    public function destroy(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        $project->delete();
        return response()->json(['success' => true]);
    }

    // Bulk save editor data (layers, strokes, shapes, erasers)
    public function bulkSave(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $payload = $request->validate([
            'data' => ['required','array'],
            'data.layers' => ['nullable','array'],
            'data.layers.*.id' => ['nullable','integer'],
            'data.layers.*.name' => ['required','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
            'data.layers.*.order' => ['required','integer','between:0,10000'],

            'data.strokes' => ['nullable','array'],
            'data.strokes.*.id' => ['nullable','integer'],
            'data.strokes.*.layer_id' => ['required','integer'],
            'data.strokes.*.points' => ['required','array','min:4'],
            'data.strokes.*.points.*' => ['numeric'],
            'data.strokes.*.color' => ['required','regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'data.strokes.*.thickness' => ['required','integer','between:1,200'],
            'data.strokes.*.isWall' => ['nullable','boolean'],
            'data.strokes.*.material' => ['nullable','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
            'data.strokes.*.rotation' => ['nullable','numeric','between:-360,360'],

            'data.erasers' => ['nullable','array'],
            'data.erasers.*.id' => ['nullable','integer'],
            'data.erasers.*.layer_id' => ['required','integer'],
            'data.erasers.*.points' => ['required','array','min:2'],
            'data.erasers.*.points.*' => ['numeric'],
            'data.erasers.*.thickness' => ['required','integer','between:1,400'],

            'data.shapes' => ['nullable','array'],
            'data.shapes.*.id' => ['nullable','integer'],
            'data.shapes.*.layer_id' => ['required','integer'],
            'data.shapes.*.type' => ['required','in:rect,circle,oval,triangle,polygon,path'],
            'data.shapes.*.x' => ['nullable','numeric'],
            'data.shapes.*.y' => ['nullable','numeric'],
            'data.shapes.*.width' => ['nullable','numeric','min:0'],
            'data.shapes.*.height' => ['nullable','numeric','min:0'],
            'data.shapes.*.radius' => ['nullable','numeric','min:0'],
            'data.shapes.*.radiusX' => ['nullable','numeric','min:0'],
            'data.shapes.*.radiusY' => ['nullable','numeric','min:0'],
            'data.shapes.*.points' => ['nullable','array'],
            'data.shapes.*.points.*' => ['numeric'],
            'data.shapes.*.fill' => ['nullable','regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'data.shapes.*.stroke' => ['nullable','regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'data.shapes.*.strokeWidth' => ['nullable','integer','between:0,200'],
            'data.shapes.*.rotation' => ['nullable','numeric','between:-360,360'],
            'data.shapes.*.closed' => ['nullable','boolean'],
            'data.shapes.*.color' => ['nullable','regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
        ]);

        $data = $payload['data'];

        DB::transaction(function () use ($project, $data) {
            // LAYERS: upsert and map incoming->actual ids
            $incomingLayers = $data['layers'] ?? [];
            $layerIdMap = []; // incomingId => realId

            foreach ($incomingLayers as $l) {
                $layer = null;
                if (!empty($l['id'])) {
                    $layer = Layer::where('id', $l['id'])
                        ->where('project_id', $project->id)
                        ->first();
                }
                if ($layer) {
                    $layer->update(['name' => trim($l['name']), 'order' => (int)$l['order']]);
                } else {
                    $layer = Layer::create([
                        'project_id' => $project->id,
                        'name' => trim($l['name']),
                        'order' => (int)$l['order'],
                    ]);
                }
                $layerIdMap[$l['id'] ?? $layer->id] = $layer->id;
            }

            $keptLayerIds = array_values($layerIdMap);
            // Optionally delete removed layers and their children
            Layer::where('project_id', $project->id)
                ->whereNotIn('id', $keptLayerIds)
                ->each(function ($layer) {
                    Stroke::where('layer_id', $layer->id)->delete();
                    Eraser::where('layer_id', $layer->id)->delete();
                    Shape::where('layer_id', $layer->id)->delete();
                    $layer->delete();
                });

            // STROKES
            $incomingStrokeIds = [];
            foreach ($data['strokes'] ?? [] as $s) {
                $targetLayerId = $layerIdMap[$s['layer_id']] ?? null;
                if (!$targetLayerId) continue;

                $attrs = [
                    'layer_id' => $targetLayerId,
                    'points' => json_encode($s['points']),
                    'color' => $s['color'],
                    'thickness' => $s['thickness'],
                    'isWall' => $s['isWall'] ?? false,
                    'material' => $s['material'] ?? null,
                    'rotation' => $s['rotation'] ?? 0,
                ];

                $stroke = null;
                if (!empty($s['id'])) {
                    $stroke = Stroke::where('id', $s['id'])
                        ->whereIn('layer_id', $keptLayerIds)
                        ->first();
                }
                $stroke = $stroke ? tap($stroke)->update($attrs) : Stroke::create($attrs);
                $incomingStrokeIds[] = $stroke->id;
            }
            Stroke::whereIn('layer_id', $keptLayerIds)
                ->whereNotIn('id', $incomingStrokeIds)
                ->delete();

            // ERASERS
            $incomingEraserIds = [];
            foreach ($data['erasers'] ?? [] as $e) {
                $targetLayerId = $layerIdMap[$e['layer_id']] ?? null;
                if (!$targetLayerId) continue;

                $attrs = [
                    'layer_id' => $targetLayerId,
                    'points' => json_encode($e['points']),
                    'thickness' => $e['thickness'],
                ];

                $er = null;
                if (!empty($e['id'])) {
                    $er = Eraser::where('id', $e['id'])
                        ->whereIn('layer_id', $keptLayerIds)->first();
                }
                $er = $er ? tap($er)->update($attrs) : Eraser::create($attrs);
                $incomingEraserIds[] = $er->id;
            }
            Eraser::whereIn('layer_id', $keptLayerIds)
                ->whereNotIn('id', $incomingEraserIds)
                ->delete();

            // SHAPES
            $incomingShapeIds = [];
            foreach ($data['shapes'] ?? [] as $sh) {
                $targetLayerId = $layerIdMap[$sh['layer_id']] ?? null;
                if (!$targetLayerId) continue;

                $attrs = [
                    'layer_id' => $targetLayerId,
                    'type' => $sh['type'],
                    'x' => $sh['x'] ?? 0,
                    'y' => $sh['y'] ?? 0,
                    'width' => $sh['width'] ?? null,
                    'height' => $sh['height'] ?? null,
                    'radius' => $sh['radius'] ?? null,
                    'radiusX' => $sh['radiusX'] ?? null,
                    'radiusY' => $sh['radiusY'] ?? null,
                    'points' => isset($sh['points']) ? json_encode($sh['points']) : null,
                    'fill' => $sh['fill'] ?? null,
                    'stroke' => $sh['stroke'] ?? null,
                    'strokeWidth' => $sh['strokeWidth'] ?? null,
                    'rotation' => $sh['rotation'] ?? 0,
                    'closed' => $sh['closed'] ?? null,
                    'color' => $sh['color'] ?? null,
                ];

                $shape = null;
                if (!empty($sh['id'])) {
                    $shape = Shape::where('id', $sh['id'])
                        ->whereIn('layer_id', $keptLayerIds)
                        ->first();
                }
                $shape = $shape ? tap($shape)->update($attrs) : Shape::create($attrs);
                $incomingShapeIds[] = $shape->id;
            }
            Shape::whereIn('layer_id', $keptLayerIds)
                ->whereNotIn('id', $incomingShapeIds)
                ->delete();

            // Touch project updated_at
            $project->touch();
        });

        return response()->json(['success' => true]);
    }
}

