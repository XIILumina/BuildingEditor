<?php

use App\Models\Project;
use App\Models\Layer;

it('deletes layers when project is deleted', function () {
    $project = Project::factory()->create();
    $layer = Layer::factory()->create(['project_id' => $project->id]);

    $project->delete();

    expect(Layer::where('id', $layer->id)->exists())->toBeFalse();
});
it('deletes shapes when layer is deleted', function () {
    $project = Project::factory()->create();
    $layer = Layer::factory()->create(['project_id' => $project->id]);
    $shape = \App\Models\Shape::factory()->create(['layer_id' => $layer->id]);

    $layer->delete();

    expect(\App\Models\Shape::where('id', $shape->id)->exists())->toBeFalse();
});
