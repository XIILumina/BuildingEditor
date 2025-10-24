<?php

use App\Models\User;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('saves a project successfully', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $project->name = 'Updated Project';
    $saved = $project->save();

    expect($saved)->toBeTrue()
        ->and(Project::find($project->id)->name)->toBe('Updated Project');
});

it('fails to save project if database error occurs', function () {
    $project = new Project(['user_id' => 9999]); // invalid user id
    $project->name = 'Broken';

    expect(fn() => $project->save())
        ->toThrow(\Illuminate\Database\QueryException::class);
});
