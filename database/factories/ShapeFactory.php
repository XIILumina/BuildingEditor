<?php

namespace Database\Factories;

use App\Models\Shape;
use Faker\Generator as Faker;
use App\Models\Layer;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShapeFactory extends Factory
{
    protected $model = Shape::class;

    public function definition(): array
    {
        // Default: rect with hex color to match DB expectations
        return [
            'layer_id' => Layer::factory(),
            'type' => 'rect',
            'x' => fake()->numberBetween(0, 500),
            'y' => fake()->numberBetween(0, 500),
            'width' => fake()->numberBetween(10, 200),
            'height' => fake()->numberBetween(10, 200),
            'color' => fake()->hexColor(),
            'fill' => null,
            'stroke' => null,
            'strokeWidth' => null,
            'rotation' => fake()->numberBetween(0, 360),
            'radius' => null,
            'radiusX' => null,
            'radiusY' => null,
            'points' => null,
            'closed' => false,
        ];
    }

    public function circle(): static
    {
        return $this->state(function () {
            return [
                'type' => 'circle',
                'radius' => fake()->numberBetween(10, 120),
                'width' => null,
                'height' => null,
            ];
        });
    }

    public function oval(): static
    {
        return $this->state(function () {
            return [
                'type' => 'oval',
                'radiusX' => fake()->numberBetween(10, 120),
                'radiusY' => fake()->numberBetween(10, 120),
                'width' => null,
                'height' => null,
            ];
        });
    }

    public function polygon(): static
    {
        return $this->state(function () {
            $pts = [];
            $count = 3 + fake()->numberBetween(0, 3);
            for ($i = 0; $i < $count; $i++) {
                $pts[] = fake()->numberBetween(0, 300);
                $pts[] = fake()->numberBetween(0, 300);
            }
            return [
                'type' => 'polygon',
                'points' => $pts,
                'fill' => fake()->hexColor(),
                'closed' => true,
                'width' => null,
                'height' => null,
                'radius' => null,
                'radiusX' => null,
                'radiusY' => null,
            ];
        });
    }
}
