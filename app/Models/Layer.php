<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;


class Layer extends Model {

    use HasFactory;
    
    protected $fillable = [
        'project_id',
        'name',
        'order'
        ];

    public function project() { return $this->belongsTo(Project::class); }
    public function strokes() { return $this->hasMany(Stroke::class); }
    public function erasers() { return $this->hasMany(Eraser::class); }
    public function shapes() { return $this->hasMany(Shape::class); }
}