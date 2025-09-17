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
    /**
     * List all projects belonging to the authenticated user
     */
    public function index()
    {
        $projects = Project::where('user_id', auth()->id())->get();

        return response()->json([
            'projects' => $projects
        ]);
    }

    /**
     * Create a new project with a default layer
     */
    public function store(Request $request)
    {
        $project = Project::create([
            'user_id' => auth()->id(),
            'name'    => $request->input('name', 'Untitled Project'),
        ]);

        Layer::create([
            'project_id' => $project->id,
            'name'       => 'Layer 1',
            'order'      => 0,
        ]);

        $project->load('layers');

        return response()->json([
            'project' => $project,
            'id'      => $project->id,
        ]);
    }

    /**
     * Load a project + flatten its data for the editor
     */
    public function show($id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with('layers.strokes', 'layers.erasers', 'layers.shapes')
            ->firstOrFail();

        $strokes = [];
        $erasers = [];
        $shapes  = [];

        foreach ($project->layers as $layer) {
            // Strokes
            foreach ($layer->strokes as $st) {
                $strokes[] = [
                    'id'        => $st->id,
                    'layer_id'  => $layer->id,
                    'points'    => is_string($st->points) ? json_decode($st->points, true) : $st->points,
                    'color'     => $st->color,
                    'thickness' => $st->thickness,
                    'isWall'    => (bool) $st->isWall,
                    'material'  => $st->material,
                ];
            }

            // Erasers
            foreach ($layer->erasers as $er) {
                $erasers[] = [
                    'id'        => $er->id,
                    'layer_id'  => $layer->id,
                    'points'    => is_string($er->points) ? json_decode($er->points, true) : $er->points,
                    'thickness' => $er->thickness,
                ];
            }

            // Shapes
            foreach ($layer->shapes as $sh) {
                $shapes[] = [
                    'id'      => $sh->id,
                    'layer_id'=> $layer->id,
                    'type'    => $sh->type,
                    'x'       => $sh->x,
                    'y'       => $sh->y,
                    'width'   => $sh->width,
                    'height'  => $sh->height,
                    'radius'  => $sh->radius,
                    'color'   => $sh->color,
                ];
            }
        }

        return response()->json([
            'project' => [
                'id'     => $project->id,
                'name'   => $project->name,
                'layers' => $project->layers,
                'data'   => [
                    'strokes' => $strokes,
                    'erasers' => $erasers,
                    'shapes'  => $shapes,
                ],
            ],
        ]);
    }

    /**
     * Save project data.
     * Supports both:
     *  - Legacy "layers" payload
     *  - Modern flat "data" payload
     */
    public function save(Request $request, $id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->with('layers')
            ->firstOrFail();

        DB::transaction(function () use ($request, $project) {
            // ✅ Legacy save mode
            if ($request->has('layers')) {
                $layersData = $request->input('layers', []);

                foreach ($layersData as $l) {
                    $layer = Layer::updateOrCreate(
                        ['id' => $l['id'] ?? null, 'project_id' => $project->id],
                        ['name' => $l['name'] ?? 'Layer', 'order' => $l['order'] ?? 0]
                    );

                    // Save strokes
                    foreach ($l['strokes'] ?? [] as $s) {
                        $attrs = [
                            'layer_id'  => $layer->id,
                            'points'    => is_array($s['points']) ? json_encode($s['points']) : $s['points'],
                            'color'     => $s['color'] ?? '#fff',
                            'thickness' => $s['thickness'] ?? 6,
                            'isWall'    => $s['isWall'] ?? false,
                            'material'  => $s['material'] ?? null,
                        ];

                        Stroke::updateOrCreate(
                            ['id' => $s['id'] ?? null, 'layer_id' => $layer->id],
                            $attrs
                        );
                    }

                    // Save erasers
                    foreach ($l['erasers'] ?? [] as $e) {
                        $attrs = [
                            'layer_id'  => $layer->id,
                            'points'    => is_array($e['points']) ? json_encode($e['points']) : $e['points'],
                            'thickness' => $e['thickness'] ?? 6,
                        ];

                        Eraser::updateOrCreate(
                            ['id' => $e['id'] ?? null, 'layer_id' => $layer->id],
                            $attrs
                        );
                    }

                    // Save shapes
                    foreach ($l['shapes'] ?? [] as $sh) {
                        $attrs = [
                            'layer_id' => $layer->id,
                            'type'     => $sh['type'] ?? 'rect',
                            'x'        => $sh['x'] ?? 0,
                            'y'        => $sh['y'] ?? 0,
                            'width'    => $sh['width'] ?? null,
                            'height'   => $sh['height'] ?? null,
                            'radius'   => $sh['radius'] ?? null,
                            'color'    => $sh['color'] ?? '#9CA3AF',
                        ];

                        Shape::updateOrCreate(
                            ['id' => $sh['id'] ?? null, 'layer_id' => $layer->id],
                            $attrs
                        );
                    }
                }
            }

            // ✅ Modern save mode
            elseif ($request->has('data')) {
                $data = $request->input('data', []);

                // Strokes
                foreach ($data['strokes'] ?? [] as $s) {
                    $layer = $project->layers->firstWhere('id', $s['layer_id']);
                    if (!$layer) continue;

                    $attrs = [
                        'layer_id'  => $layer->id,
                        'points'    => is_array($s['points']) ? json_encode($s['points']) : $s['points'],
                        'color'     => $s['color'] ?? '#fff',
                        'thickness' => $s['thickness'] ?? 6,
                        'isWall'    => $s['isWall'] ?? false,
                        'material'  => $s['material'] ?? null,
                    ];

                    Stroke::updateOrCreate(
                        ['id' => $s['id'] ?? null, 'layer_id' => $layer->id],
                        $attrs
                    );
                }

                // Erasers
                foreach ($data['erasers'] ?? [] as $e) {
                    $layer = $project->layers->firstWhere('id', $e['layer_id']);
                    if (!$layer) continue;

                    $attrs = [
                        'layer_id'  => $layer->id,
                        'points'    => is_array($e['points']) ? json_encode($e['points']) : $e['points'],
                        'thickness' => $e['thickness'] ?? 6,
                    ];

                    Eraser::updateOrCreate(
                        ['id' => $e['id'] ?? null, 'layer_id' => $layer->id],
                        $attrs
                    );
                }

                // Shapes
                foreach ($data['shapes'] ?? [] as $sh) {
                    $layer = $project->layers->firstWhere('id', $sh['layer_id']);
                    if (!$layer) continue;

                    $attrs = [
                        'layer_id' => $layer->id,
                        'type'     => $sh['type'] ?? 'rect',
                        'x'        => $sh['x'] ?? 0,
                        'y'        => $sh['y'] ?? 0,
                        'width'    => $sh['width'] ?? null,
                        'height'   => $sh['height'] ?? null,
                        'radius'   => $sh['radius'] ?? null,
                        'color'    => $sh['color'] ?? '#9CA3AF',
                    ];

                    Shape::updateOrCreate(
                        ['id' => $sh['id'] ?? null, 'layer_id' => $layer->id],
                        $attrs
                    );
                }
            }
        });

        return response()->json(['success' => true]);
    }

    /**
     * Update project name
     */
    public function updateName(Request $request, $id)
    {
        $request->validate(['name' => 'required|string|max:255']);

        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $project->update(['name' => $request->input('name')]);

        return response()->json([
            'success' => true,
            'project' => $project,
        ]);
    }

    /**
     * Add a new layer to the project
     */
    public function addLayer(Request $request, $id)
    {
        $project = Project::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $layer = Layer::create([
            'project_id' => $project->id,
            'name'       => $request->input('name', 'Layer ' . ($project->layers()->count() + 1)),
            'order'      => $request->input('order', ($project->layers()->max('order') ?? 0) + 1),
        ]);

        return response()->json(['layer' => $layer]);
    }
}
