<?php

use App\Models\User;

it('can create a user', function () {
    $user = User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@example.com',
    ]);

    expect($user)->toBeInstanceOf(User::class);
    expect($user->email)->toBe('test@example.com');
});

it('can delete a user', function () {
    $user = User::factory()->create();

    $userId = $user->id;
    $user->delete();

    expect(User::find($userId))->toBeNull();
});
it('can update a user name', function () {
    $user = User::factory()->create([
        'name' => 'Old Name',
    ]);

    $user->name = 'New Name';
    $user->save();

    expect($user->name)->toBe('New Name');
});
it('can retrieve user projects', function () {
    $user = User::factory()->create();
    $project = \App\Models\Project::factory()->create(['user_id' => $user->id]);

    $projects = $user->projects;

    expect($projects->first()->id)->toBe($project->id);
});
it('deletes projects when user is deleted', function () {
    $user = User::factory()->create();
    $project = \App\Models\Project::factory()->create(['user_id' => $user->id]);

    $user->delete();

    expect(\App\Models\Project::where('id', $project->id)->exists())->toBeFalse();
});

