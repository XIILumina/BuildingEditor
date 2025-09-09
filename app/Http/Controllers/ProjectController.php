<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index()
    {
        if (!auth()->check()) {
            return response()->json(['projects' => []]);
        }

        return response()->json([
            'projects' => auth()->user()->projects()->get(),
        ]);
    }

    public function show($id)
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::where('id', $id)->where('user_id', auth()->id())->first();

        if (!$project) {
            $project = Project::create([
                'user_id' => auth()->id(),
                'name' => 'New Project ' . $id,
                'data' => ['lines' => []],
            ]);
        }

        return response()->json(['project' => $project]);
    }

    public function save(Request $request, $id)
{
    $project = Project::where('id', $id)
        ->where('user_id', auth()->id())
        ->firstOrFail();

    $project->update([
        'data' => $request->input('data', []),
    ]);

    return response()->json([
        'success' => true,
        'project' => $project,
    ]);
}

public function destroy($id)
{
    $project = Project::where('id', $id)
        ->where('user_id', auth()->id())
        ->firstOrFail();

    $project->delete();

    return response()->json(['success' => true]);
}

public function store(Request $request)
{
    $this->validate($request, [
        'name' => 'nullable|string|max:255',
    ]);

    $project = Project::create([
        'user_id' => auth()->id(),
        'name' => $request->input('name', 'New Project'),
        'data' => $request->input('data', ['lines' => []]),
    ]);

    return response()->json([
        'id' => $project->id,
        'project' => $project,
    ]);
}

public function create() {
    $project = Project::create([
        'user_id' => auth()->id(),
        'name' => 'Untitled Project',
        'data' => ['lines' => []],
    ]);
        return response()->json(['id' => $project->id]);
}

   public function update(Request $request, $id)
{
    $project = Project::findOrFail($id);

    $project->data = json_encode([
        'lines' => $request->input('lines', []),
    ]);

    $project->save();

    return response()->json(['success' => true]);
}
}
