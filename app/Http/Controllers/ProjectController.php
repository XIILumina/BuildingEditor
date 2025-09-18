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
}