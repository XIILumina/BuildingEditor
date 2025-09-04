<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index()
    {
        return Inertia::render('Projects/Index', [
            'projects' => auth()->user()->projects()->get(),
        ]);
    }

    public function show($id)
    {
        return Inertia::render('Projects/Show', [
            'project' => Project::findOrFail($id),
        ]);
    }

    public function store(Request $request)
    {
        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $request->name ?? 'New Project',
            'data' => $request->data, // Saved as JSON
        ]);
        return response()->json($project);
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);
        $project->update([
            'data' => $request->data, // Updated as JSON
        ]);
        return response()->json($project);
    }
    
}