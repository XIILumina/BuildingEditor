<?php
<?php

namespace App\Http\Controllers;

use App\Models\Layer;
use App\Models\Project;
use Illuminate\Http\Request;

class LayersController extends Controller
{
    public function index(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        return Layer::where('project_id', $project->id)
            ->select('id','name','order')
            ->orderBy('order')
            ->get();
    }

    public function store(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'name' => ['required','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
            'order' => ['required','integer','between:0,10000'],
        ]);

        $layer = Layer::create([
            'project_id' => $project->id,
            'name' => trim($data['name']),
            'order' => $data['order'],
        ]);

        return response()->json($layer, 201);
    }

    public function update(Request $request, Project $project, Layer $layer)
    {
        abort_unless($project->user_id === $request->user()->id && $layer->project_id === $project->id, 403);

        $data = $request->validate([
            'name' => ['sometimes','string','max:64','regex:/^[\pL\pN\s\-_]+$/u'],
            'order' => ['sometimes','integer','between:0,10000'],
        ]);

        $layer->update(array_filter([
            'name' => isset($data['name']) ? trim($data['name']) : null,
            'order' => $data['order'] ?? null,
        ], fn($v) => !is_null($v)));

        return response()->json($layer);
    }

    public function destroy(Request $request, Project $project, Layer $layer)
    {
        abort_unless($project->user_id === $request->user()->id && $layer->project_id === $project->id, 403);
        $layer->delete();
        return response()->json(['success' => true]);
    }
}