<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/*  Eraser modelis, kas neļauj lai nekāda cita informācija izņemot definēto varētu tikt datubāzē */
class Eraser extends Model {

    protected $fillable = [
    'layer_id',
    'points',
    'thickness'
    ];
    protected $casts = ['points' => 'array'];

    public function layer()
     {
         return $this->belongsTo(Layer::class);
         }

}