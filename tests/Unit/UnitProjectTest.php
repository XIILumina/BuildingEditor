<?php

use App\Models\User;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a new project for a user', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    expect($project->user)->toBeInstanceOf(User::class)
        ->and($project->user_id)->toBe($user->id);
});

it('fails to create a project without a user', function () {
    expect(fn() => Project::factory()->create(['user_id' => null]))
        ->toThrow(\Illuminate\Database\QueryException::class);
});
