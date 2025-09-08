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

    public function store(Request $request)
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $request->input('name', 'New Project'),
            'data' => $request->input('data', ['lines' => []]),
        ]);

        return response()->json($project);
    }

    public function update(Request $request, $id)
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $project = Project::where('id', $id)->where('user_id', auth()->id())->first();

        if (!$project) {
            $project = Project::create([
                'user_id' => auth()->id(),
                'name' => 'New Project ' . $id,
                'data' => $request->input('data', ['lines' => []]),
            ]);
        } else {
            $project->update([
                'data' => $request->input('data'),
            ]);
        }

        return response()->json($project);
    }
}
