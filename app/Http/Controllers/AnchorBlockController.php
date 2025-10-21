<?php

namespace App\Http\Controllers;

use App\Models\Shape;
use App\Models\Stroke;
use App\Models\Block;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AnchorBlockController extends Controller
{
    public function anchor(Request $request)
    {
        $data = $request->validate([
            'layer_id' => 'required|integer|exists:layers,id',
            'object_id' => 'required|array',
        ]);

        $shapes = Shape::whereIn('id', $data['object_id'])->get();
        $strokes = Stroke::whereIn('id', $data['object_id'])->get();
        $objects = $shapes->merge($strokes);

        // Calculate bounding box
        $minX = $minY = PHP_INT_MAX;
        $maxX = $maxY = PHP_INT_MIN;

        foreach ($objects as $obj) {
            if ($obj instanceof Shape) {
                if ($obj->type === 'rect') {
                    $minX = min($minX, $obj->x);
                    $minY = min($minY, $obj->y);
                    $maxX = max($maxX, $obj->x + ($obj->width ?? 0));
                    $maxY = max($maxY, $obj->y + ($obj->height ?? 0));
                } elseif ($obj->type === 'circle' || $obj->type === 'ellipse') {
                    $radiusX = $obj->radius ?? $obj->radiusX ?? 40;
                    $radiusY = $obj->radius ?? $obj->radiusY ?? 40;
                    $minX = min($minX, $obj->x - $radiusX);
                    $minY = min($minY, $obj->y - $radiusY);
                    $maxX = max($maxX, $obj->x + $radiusX);
                    $maxY = max($maxY, $obj->y + $radiusY);
                } elseif ($obj->type === 'regularPolygon') {
                    $radius = $obj->radius ?? 40;
                    $minX = min($minX, $obj->x - $radius);
                    $minY = min($minY, $obj->y - $radius);
                    $maxX = max($maxX, $obj->x + $radius);
                    $maxY = max($maxY, $obj->y + $radius);
                }
            } elseif ($obj instanceof Stroke) {
                $points = is_string($obj->points) ? json_decode($obj->points, true) : $obj->points;
                for ($i = 0; $i < count($points); $i += 2) {
                    $minX = min($minX, $points[$i]);
                    $minY = min($minY, $points[$i + 1]);
                    $maxX = max($maxX, $points[$i]);
                    $maxY = max($maxY, $points[$i + 1]);
                }
            }
        }

        $width = $maxX - $minX;
        $height = $maxY - $minY;
        $anchor_x = $minX + ($width / 2);
        $anchor_y = $minY + ($height / 2);
        $x = $minX;
        $y = $minY;

        $block = Block::create([
            'layer_id' => $data['layer_id'],
            'object_id' => json_encode($data['object_id']),
            'x' => $x,
            'y' => $y,
            'width' => $width,
            'height' => $height,
            'anchor_x' => $anchor_x,
            'anchor_y' => $anchor_y,
            'points' => null,
        ]);

        Shape::whereIn('id', $data['object_id'])->update(['block_id' => $block->id]);
        Stroke::whereIn('id', $data['object_id'])->update(['block_id' => $block->id]);

        Log::info('Anchored block with ID: ' . $block->id . ' to objects: ' . implode(',', $data['object_id']));
        return response()->json(['block' => $block, 'block_id' => $block->id]);
    }

    public function unanchor($id)
    {
        $block = Block::findOrFail($id);
        $objectIds = json_decode($block->object_id, true) ?? [];

        Shape::whereIn('id', $objectIds)->update(['block_id' => null]);
        Stroke::whereIn('id', $objectIds)->update(['block_id' => null]);

        $block->delete();

        return response()->json(['message' => 'Block unanchored']);
    }

    // Comment out if unused
    /*
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'layer_id' => 'sometimes|integer|exists:layers,id',
            'object_id' => 'sometimes|array',
            'points' => 'sometimes|array',
            'width' => 'sometimes|integer',
            'height' => 'sometimes|integer',
            'anchor_x' => 'sometimes|integer',
            'anchor_y' => 'sometimes|integer',
        ]);

        $block = Block::findOrFail($id);
        $block->update($data);

        return response()->json(['block' => $block]);
    }

    public function destroy($id)
    {
        $block = Block::findOrFail($id);
        $block->delete();

        return response()->json(['message' => 'Block deleted']);
    }
    */
}