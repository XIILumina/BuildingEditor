<?php

use App\Models\Layer;
use App\Models\Project;

it('creates a layer linked to a project', function () {
    $project = Project::factory()->create();
    $layer = Layer::create([
        'project_id' => $project->id,
        'order' => 1,
    ]);

    expect($layer->project_id)->toBe($project->id);
});

it('deletes a layer', function () {
    $project = Project::factory()->create();
    $layer = Layer::create([
        'project_id' => $project->id,
        'order' => 1,
    ]);

    $layerId = $layer->id;
    $layer->delete();

    expect(Layer::find($layerId))->toBeNull();
});
