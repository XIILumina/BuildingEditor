<?php

namespace Database\Factories;

use App\Models\Layer;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

class LayerFactory extends Factory
{
    protected $model = Layer::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => 'Layer ' . fake()->numberBetween(1, 99),
            'order' => fake()->numberBetween(0, 10),
        ];
    }
}
