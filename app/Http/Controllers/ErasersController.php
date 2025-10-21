<?php
<?php

namespace App\Http\Controllers;

use App\Models\Eraser;
use App\Models\Layer;
use App\Models\Project;
use Illuminate\Http\Request;

class ErasersController extends Controller
{
    public function index(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        return Eraser::whereHas('layer', fn($q) => $q->where('project_id', $project->id))
            ->select('id','layer_id','points','thickness')
            ->get();
    }

    public function store(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'layer_id' => ['required','integer'],
            'points' => ['required','array','min:2'],
            'points.*' => ['numeric'],
            'thickness' => ['required','integer','between:1,400'],
        ]);

        $layer = Layer::where('id', $data['layer_id'])->where('project_id', $project->id)->firstOrFail();

        $er = Eraser::create([
            'layer_id' => $layer->id,
            'points' => json_encode($data['points']),
            'thickness' => $data['thickness'],
        ]);

        return response()->json($er, 201);
    }

    public function update(Request $request, Project $project, Eraser $eraser)
    {
        abort_unless($project->user_id === $request->user()->id && $eraser->layer->project_id === $project->id, 403);

        $data = $request->validate([
            'points' => ['sometimes','array','min:2'],
            'points.*' => ['numeric'],
            'thickness' => ['sometimes','integer','between:1,400'],
        ]);

        $eraser->update([
            'points' => isset($data['points']) ? json_encode($data['points']) : $eraser->points,
            'thickness' => $data['thickness'] ?? $eraser->thickness,
        ]);

        return response()->json($eraser);
    }

    public function destroy(Request $request, Project $project, Eraser $eraser)
    {
        abort_unless($project->user_id === $request->user()->id && $eraser->layer->project_id === $project->id, 403);
        $eraser->delete();
        return response()->json(['success' => true]);
    }
}