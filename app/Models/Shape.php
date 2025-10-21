<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shape extends Model
{
    protected $fillable = [
        'layer_id',
        'type',
        'x',
        'y',
        'width',
        'height',
        'radius',
        'radiusX',
        'radiusY',
        'color',
        'fill',
        'stroke',
        'strokeWidth',
        'rotation',
        'closed',
        'points',
        'data',
        'block_id'
    ];

    protected $casts = [
        'points' => 'array',
        'closed' => 'boolean',
    ];

    public function layer() { return $this->belongsTo(Layer::class); }
}