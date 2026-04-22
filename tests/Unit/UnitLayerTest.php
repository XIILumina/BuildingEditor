<?php

use App\Models\Project;
use App\Models\Layer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a layer linked to a project', function () {
    $project = Project::factory()->create();
    $layer = Layer::factory()->create(['project_id' => $project->id]);

    expect($layer->project)->toBeInstanceOf(Project::class);
});

it('orders layers correctly', function () {
    $project = Project::factory()->create();
    $layer1 = Layer::factory()->create(['project_id' => $project->id, 'order' => 1]);
    $layer2 = Layer::factory()->create(['project_id' => $project->id, 'order' => 2]);

    $layers = $project->layers()->orderBy('order')->get();

    expect($layers->first()->id)->toBe($layer1->id)
        ->and($layers->last()->id)->toBe($layer2->id);
});
