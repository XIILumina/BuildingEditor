<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Block extends Model
{
      protected $fillable = [
        'layer_id',
        'object_ids', // JSON array of IDs
        'points',
        'width',
        'height',
        'anchor_x',
        'anchor_y',

    ];  

        public function shapes()
    {
        return $this->hasMany(Shape::class, 'shape_id');
    }
        public function layer() 
        { 
            return $this->belongsTo(Layer::class); 
        }

        protected $casts = [
            'object_ids' => 'array',
            'points' => 'array',
        ];
}
