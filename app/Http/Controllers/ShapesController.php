<?php
<?php

namespace App\Http\Controllers;

use App\Models\Shape;
use App\Models\Layer;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShapesController extends Controller
{
    public function index(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        return Shape::whereHas('layer', fn($q) => $q->where('project_id', $project->id))
            ->select('id','layer_id','type','x','y','width','height','radius','radiusX','radiusY','points','fill','stroke','strokeWidth','rotation','closed','color')
            ->get();
    }

    public function store(Request $request, Project $project)
    {
        abort_unless($project->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'layer_id' => ['required','integer'],
            'type' => ['required', Rule::in(['rect','circle','oval','triangle','polygon'])],
            'x' => ['nullable','numeric'],
            'y' => ['nullable','numeric'],
            'width' => ['nullable','numeric','min:0'],
            'height' => ['nullable','numeric','min:0'],
            'radius' => ['nullable','numeric','min:0'],
            'radiusX' => ['nullable','numeric','min:0'],
            'radiusY' => ['nullable','numeric','min:0'],
            'points' => ['nullable','array'],
            'points.*' => ['numeric'],
            'fill' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'stroke' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'strokeWidth' => ['nullable','integer','between:0,200'],
            'rotation' => ['nullable','numeric','between:-360,360'],
            'closed' => ['nullable','boolean'],
            'color' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $layer = Layer::where('id', $data['layer_id'])->where('project_id', $project->id)->firstOrFail();

        $shape = Shape::create([
            'layer_id' => $layer->id,
            'type' => $data['type'],
            'x' => $data['x'] ?? 0,
            'y' => $data['y'] ?? 0,
            'width' => $data['width'] ?? null,
            'height' => $data['height'] ?? null,
            'radius' => $data['radius'] ?? null,
            'radiusX' => $data['radiusX'] ?? null,
            'radiusY' => $data['radiusY'] ?? null,
            'points' => isset($data['points']) ? json_encode($data['points']) : null,
            'fill' => $data['fill'] ?? null,
            'stroke' => $data['stroke'] ?? null,
            'strokeWidth' => $data['strokeWidth'] ?? null,
            'rotation' => $data['rotation'] ?? 0,
            'closed' => $data['closed'] ?? null,
            'color' => $data['color'] ?? null,
        ]);

        return response()->json($shape, 201);
    }

    public function update(Request $request, Project $project, Shape $shape)
    {
        abort_unless($project->user_id === $request->user()->id && $shape->layer->project_id === $project->id, 403);

        $data = $request->validate([
            'x' => ['sometimes','numeric'],
            'y' => ['sometimes','numeric'],
            'width' => ['nullable','numeric','min:0'],
            'height' => ['nullable','numeric','min:0'],
            'radius' => ['nullable','numeric','min:0'],
            'radiusX' => ['nullable','numeric','min:0'],
            'radiusY' => ['nullable','numeric','min:0'],
            'points' => ['nullable','array'],
            'points.*' => ['numeric'],
            'fill' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'stroke' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'strokeWidth' => ['nullable','integer','between:0,200'],
            'rotation' => ['nullable','numeric','between:-360,360'],
            'closed' => ['nullable','boolean'],
            'color' => ['nullable','regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $shape->update([
            'x' => $data['x'] ?? $shape->x,
            'y' => $data['y'] ?? $shape->y,
            'width' => $data['width'] ?? $shape->width,
            'height' => $data['height'] ?? $shape->height,
            'radius' => $data['radius'] ?? $shape->radius,
            'radiusX' => $data['radiusX'] ?? $shape->radiusX,
            'radiusY' => $data['radiusY'] ?? $shape->radiusY,
            'points' => array_key_exists('points', $data) ? json_encode($data['points']) : $shape->points,
            'fill' => array_key_exists('fill', $data) ? $data['fill'] : $shape->fill,
            'stroke' => array_key_exists('stroke', $data) ? $data['stroke'] : $shape->stroke,
            'strokeWidth' => array_key_exists('strokeWidth', $data) ? $data['strokeWidth'] : $shape->strokeWidth,
            'rotation' => array_key_exists('rotation', $data) ? $data['rotation'] : $shape->rotation,
            'closed' => array_key_exists('closed', $data) ? $data['closed'] : $shape->closed,
            'color' => array_key_exists('color', $data) ? $data['color'] : $shape->color,
        ]);

        return response()->json($shape);
    }

    public function destroy(Request $request, Project $project, Shape $shape)
    {
        abort_unless($project->user_id === $request->user()->id && $shape->layer->project_id === $project->id, 403);
        $shape->delete();
        return response()->json(['success' => true]);
    }
}