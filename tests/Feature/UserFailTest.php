<?php

use App\Models\Project;

it('fails to create project with invalid user_id', function () {
    $this->expectException(\Illuminate\Database\QueryException::class);

    Project::create([
        'user_id' => 99999, // neeksistējošs lietotājs
    ]);
});
