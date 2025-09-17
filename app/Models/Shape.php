<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shape extends Model {

    protected $fillable = [
        'layer_id',
        'type',
        'x',
        'y',
        'width',
        'height',
        'radius',
        'color'
    ];
    public function layer() { return $this->belongsTo(Layer::class); }
}