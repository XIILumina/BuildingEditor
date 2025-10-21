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
        'points',      // json array
        'fill',        // for polygons
        'stroke',
        'strokeWidth',
        'rotation',    // default 0 in DB
        'closed',
        'color',       // for rect/circle/oval fallback
    ];

    public function layer()
    {
        return $this->belongsTo(Layer::class);
    }
}