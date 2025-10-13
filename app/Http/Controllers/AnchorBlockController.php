<?php

namespace App\Http\Controllers;

use Illuminate\Container\Attributes\Log;
use App\Models\Block;
use Illuminate\Http\Request;

class AnchorBlockController extends Controller
{
public function store(Request $request)
    {
        \Log::error("Storing AnchorBlock: " . json_encode($request->all()));
        $data = $request->validate([
            'layer_id' => 'required|integer|exists:layers,id',
            'object_id' => 'required|array',
            'width' => 'required|integer',
            'height' => 'required|integer',
            'anchor_x' => 'required|integer',
            'anchor_y' => 'required|integer',
            'points' => 'nullable|array',
        ]);

        $block = Block::create([
            'layer_id' => $data['layer_id'],
            'object_id' => json_encode($data['object_id']),
            'width' => $data['width'],
            'height' => $data['height'],
            'anchor_x' => $data['anchor_x'],
            'anchor_y' => $data['anchor_y'],
            'points' => isset($data['points']) ? json_encode($data['points']) : null,
        ]);
        return response()->json(['block' => $block]);
    }


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
}