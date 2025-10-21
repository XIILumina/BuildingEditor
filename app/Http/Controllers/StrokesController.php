<?php
<?php

namespace App\Http\Controllers;

use App\Models\Stroke;
use App\Models\Layer;
use App\Models\Project;
use Illuminate\Http\Request;

class StrokesController extends Controller
{
    public function index(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        return Stroke::whereHas('layer', fn($q) => $q->where('project_id', $project->id))
            ->select('id','layer_id','points','color','thickness','isWall','material')
            ->get();
    }

    public function store(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'layer_id' => ['required','integer'],
            'points' => ['required','array','min:4'],
            'points.*' => ['numeric'],
            'color' => ['required','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'thickness' => ['required','integer','between:1,200'],
            'isWall' => ['sometimes','boolean'],
            'material' => ['nullable','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
        ]);

        // Ensure layer belongs to project
        $layer = Layer::where('id', $data['layer_id'])->where('project_id', $project->id)->firstOrFail();

        $stroke = Stroke::create([
            'layer_id' => $layer->id,
            'points' => json_encode($data['points']),
            'color' => $data['color'],
            'thickness' => $data['thickness'],
            'isWall' => $data['isWall'] ?? false,
            'material' => $data['material'] ?? null,
        ]);

        return response()->json($stroke, 201);
    }

    public function update(Request $request, Project $project, Stroke $stroke)
    {
        abort_unless($project->user_id === $request->user()->id && $stroke->layer->project_id === $project->id, 403);

        $data = $request->validate([
            'points' => ['sometimes','array','min:4'],
            'points.*' => ['numeric'],
            'color' => ['sometimes','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'thickness' => ['sometimes','integer','between:1,200'],
            'isWall' => ['sometimes','boolean'],
            'material' => ['nullable','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
        ]);

        $stroke->update([
            'points' => isset($data['points']) ? json_encode($data['points']) : $stroke->points,
            'color' => $data['color'] ?? $stroke->color,
            'thickness' => $data['thickness'] ?? $stroke->thickness,
            'isWall' => $data['isWall'] ?? $stroke->isWall,
            'material' => array_key_exists('material', $data) ? $data['material'] : $stroke->material,
        ]);

        return response()->json($stroke);
    }

    public function destroy(Request $request, Project $project, Stroke $stroke)
    {
        abort_unless($project->user_id === $request->user()->id && $stroke->layer->project_id === $project->id, 403);
        $stroke->delete();
        return response()->json(['success' => true]);
    }
}