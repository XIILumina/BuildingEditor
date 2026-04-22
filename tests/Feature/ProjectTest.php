<?php 
use App\Models\User;
use App\Models\Project;

it('creates a project linked to a user', function () {
    $user = User::factory()->create();
    $project = Project::create([
        'user_id' => $user->id,
    ]);

    expect($project->user_id)->toBe($user->id);
});
it('updates project name', function () {
    $user = User::factory()->create();
    $project = Project::create([
        'user_id' => $user->id,
    ]);

    $project->name = 'New Project Name';
    $project->save();

    expect($project->name)->toBe('New Project Name');
});
it('deletes a project', function () {
    $user = User::factory()->create();
    $project = Project::create([
        'user_id' => $user->id,
    ]);

    $projectId = $project->id;
    $project->delete();

    expect(Project::find($projectId))->toBeNull();
});
