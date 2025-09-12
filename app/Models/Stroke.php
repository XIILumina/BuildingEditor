<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stroke extends Model {
    protected $fillable = [
        'layer_id',
        'points',
        'color',
        'thickness',
        'isWall',
        'material'
        ];

    protected $casts = ['points' => 'array'];

    
    public function layer() { return $this->belongsTo(Layer::class); }
}
