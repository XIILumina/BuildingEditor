    <?php

    use App\Models\Shape;
    use App\Models\Layer;

    it('creates a shape', function () {
        $layer = Layer::factory()->create();
        $shape = Shape::create([
            'layer_id' => $layer->id,
            'type' => 'rect',
            'x' => 10,
            'y' => 20,
            'width' => 100,
            'height' => 50,
        ]);
        expect($shape->layer_id)->toBe($layer->id);
        expect($shape->type)->toBe('rect');
        expect($shape->x)->toBe(10);
        expect($shape->y)->toBe(20);
        expect($shape->width)->toBe(100);
        expect($shape->height)->toBe(50);
    });

    it('updates shape properties', function () {
        $layer = Layer::factory()->create();
        $shape = Shape::create([
            'layer_id' => $layer->id,
            'type' => 'rect',
        ]);

        $shape->color = '#FF0000';
        $shape->closed = true;
        $shape->save();

        expect($shape->color)->toBe('#FF0000');
        expect($shape->closed)->toBeTrue();
    });

    it('deletes a shape', function () {
        $layer = Layer::factory()->create();
        $shape = Shape::create([
            'layer_id' => $layer->id,
            'type' => 'rect',
        ]);

        $shapeId = $shape->id;
        $shape->delete();

        expect(Shape::find($shapeId))->toBeNull();
    });

