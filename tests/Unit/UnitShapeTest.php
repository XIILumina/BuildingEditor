<?php

use App\Models\Layer;
use App\Models\Shape;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a shape with default properties', function () {
    $layer = Layer::factory()->create();
    $shape = Shape::factory()->create([
        'layer_id' => $layer->id, 
        'color' => '#9CA3AF'
    ]);

    expect($shape->layer)->toBeInstanceOf(Layer::class)
        ->and($shape->color)->toBe('#9CA3AF')
        ->and($shape->closed)->toBeFalse();
});

it('links shape correctly to its layer', function () {
    $layer = Layer::factory()->create();
    $shape = Shape::factory()->create(['layer_id' => $layer->id]);

   $layer->load('shapes');
expect($layer->shapes->contains($shape->id))->toBeTrue();
});
